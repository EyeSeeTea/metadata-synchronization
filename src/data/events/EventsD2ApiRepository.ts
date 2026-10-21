import _ from "lodash";
import moment from "moment";
import {
    DataImportParams,
    DataSynchronizationParams,
    isDataSynchronizationRequired,
} from "../../domain/aggregated/entities/DataSynchronizationParams";
import { buildPeriodFromParams } from "../../domain/aggregated/utils";
import { EventsPackage } from "../../domain/events/entities/EventsPackage";
import { ProgramEvent } from "../../domain/events/entities/ProgramEvent";
import { ProgramStageRef } from "../../domain/events/mapper/Models";
import { EventsRepository } from "../../domain/events/repositories/EventsRepository";
import { Instance } from "../../domain/instance/entities/Instance";
import { SynchronizationResult } from "../../domain/reports/entities/SynchronizationResult";
import { cleanObjectDefault, cleanOrgUnitPaths } from "../../domain/synchronization/utils";
import { D2Api, D2TrackerEvent, TrackerPostParams, TrackerPostRequest, TrackerPostResponse } from "../../types/d2-api";
import { Future } from "../../domain/common/entities/Future";
import { promiseMap } from "../../utils/common";
import { getD2APiFromInstance } from "../../utils/d2-utils";
import mime from "mime-types";
import { getRemainingPages, getTotal } from "../../utils/pagination";

const PAGE_SIZE = 250;
const ORG_UNIT_REQUESTS_CONCURRENCY = 4;
// Reason: measured on 2.42, a 250-event scan page takes ~2.1s vs ~0.6s for a single-orgUnit request
const SCAN_PAGE_COST_FACTOR = 4;

export class EventsD2ApiRepository implements EventsRepository {
    private api: D2Api;

    constructor(localInstance: Instance, private targetInstance: Instance) {
        this.api = getD2APiFromInstance(localInstance, targetInstance);
    }

    public async getEvents(
        params: DataSynchronizationParams,
        programStages: ProgramStageRef[] = [],
        defaults: string[] = []
    ): Promise<ProgramEvent[]> {
        const events = await this.getEventsByStrategy(params, programStages, defaults);

        // Temporal fix for notes:
        // If a note already exist and sync again the event the sync fail
        // Remove notes until the bug is fixed by dhis2
        const eventsWithoutNotes = events.map(event => ({ ...event, notes: [] }));

        return eventsWithoutNotes;
    }

    private async getEventsByStrategy(
        params: DataSynchronizationParams,
        programStages: ProgramStageRef[] = [],
        defaults: string[] = []
    ): Promise<ProgramEvent[]> {
        const { allEvents = false, orgUnitPaths = [] } = params;

        if (!allEvents) {
            return this.getSpecificEvents(params, programStages, defaults);
        }

        const orgUnits = cleanOrgUnitPaths(orgUnitPaths);
        if (programStages.length === 0 || orgUnits.length === 0) return [];

        const periodFilter = buildEventsPeriodFilter(params);

        const result = await promiseMap(programStages, async ({ id: programStage, program }) => {
            const query = { program: program.id, programStage, ...periodFilter };
            const stageTotal = await this.countStageEvents(query);

            return shouldScanStage(stageTotal, orgUnits.length)
                ? this.getAllEvents(query, orgUnits)
                : this.getEventsByOrgUnit(query, orgUnits);
        });

        const systemInfo = await this.api.system.info.getData();
        const serverTimeZoneId = systemInfo.serverTimeZoneId;
        return _(result)
            .flatten()
            .map(object => {
                const event = { ...object, id: object.event };

                return isDataSynchronizationRequired(params, object.updatedAt, serverTimeZoneId)
                    ? cleanObjectDefault(event, defaults)
                    : undefined;
            })
            .compact()
            .value();
    }

    /**
     * Design choices and heads-up:
     *  - The events endpoint does not support multiple values for a given filter
     *    meaning you cannot query for multiple programs or multiple orgUnits in
     *    the same API call. Instead you need to query one by one
     *  - Querying one by one is not performant when many orgUnits are selected for a small stage,
     *    so getEventsByStrategy may instead query all events of the stage and filter them in this method
     *  - For big databases querying for all events available in a given instance
     *    with paging=false makes the instance to eventually go offline
     *  - Instead of disabling paging we traverse all the events by paginating all
     *    the available pages so that we can filter them afterwards
     */
    private async getAllEvents(query: EventsQuery, orgUnits: string[]): Promise<D2TrackerEvent[]> {
        const selectedOrgUnits = new Set(orgUnits);
        const events = await this.getAllPages(query);

        return events.filter(({ orgUnit }) => selectedOrgUnits.has(orgUnit));
    }

    private async getEventsByOrgUnit(query: EventsQuery, orgUnits: string[]): Promise<D2TrackerEvent[]> {
        const eventsByOrgUnit = await Future.parallel(
            orgUnits.map(orgUnit =>
                Future.fromComputation<unknown, D2TrackerEvent[]>((resolve, reject) => {
                    this.getAllPages({ ...query, orgUnit }).then(resolve, reject);
                    return () => {};
                })
            ),
            { concurrency: ORG_UNIT_REQUESTS_CONCURRENCY }
        ).toPromise();

        return _.flatten(eventsByOrgUnit);
    }

    private async countStageEvents(query: EventsQuery): Promise<number> {
        const response = await this.api.tracker.events
            .get({ ...query, page: 1, pageSize: 1, totalPages: true, fields: { event: true } })
            .getData();

        return getTotal(response);
    }

    private async getAllPages(query: EventsQuery): Promise<D2TrackerEvent[]> {
        const fetchApi = async (page: number) => {
            return this.api.tracker.events
                .get({
                    pageSize: PAGE_SIZE,
                    ...(page === 1 ? { totalPages: true } : {}),
                    page,
                    ...query,
                    fields: { $all: true },
                })
                .getData();
        };

        const firstResponse = await fetchApi(1);

        const remainingPages = getRemainingPages(firstResponse);

        const paginatedEvents = await promiseMap(remainingPages, async page => {
            const response = await fetchApi(page);

            return this.extractEvents(response);
        });

        const events = this.extractEvents(firstResponse);

        return [...events, ..._.flatten(paginatedEvents)];
    }

    private async getSpecificEvents(
        params: DataSynchronizationParams,
        programStages: ProgramStageRef[] = [],
        defaults: string[] = []
    ): Promise<ProgramEvent[]> {
        const { orgUnitPaths = [], events: filter = [] } = params;
        if (programStages.length === 0 || filter.length === 0) return [];

        const orgUnits = cleanOrgUnitPaths(orgUnitPaths);
        const requestedIds = new Set(filter);
        const result = [];

        for (const { id: programStage, program } of programStages) {
            for (const ids of _.chunk(filter, 300)) {
                // Reason: d2-api typings only know the pre-2.41 params (`event`, `skipPaging`)
                const response = await this.api
                    .get<RawEventsResponse>(
                        "/tracker/events",
                        buildSpecificEventsParams(this.targetInstance.apiVersion, ids, program.id, programStage)
                    )
                    .getData();

                const events = this.extractEvents(response);

                result.push(...events);
            }
        }

        return _(result)
            .filter(({ orgUnit, event }) => orgUnits.includes(orgUnit) && requestedIds.has(event))
            .map(object => ({ ...object, id: object.event }))
            .map(object => cleanObjectDefault(object, defaults))
            .value();
    }

    public async save(data: EventsPackage, params: DataImportParams = {}): Promise<SynchronizationResult> {
        try {
            return this.push(params, data.events);
        } catch (error: any) {
            if (error?.response?.data) {
                return this.cleanEventsImportResponse(error.response.data);
            }

            return {
                status: "NETWORK ERROR",
                instance: this.targetInstance.toPublicObject(),
                date: new Date(),
                type: "events",
            };
        }
    }

    private cleanEventsImportResponse(importResult: TrackerPostResponse): SynchronizationResult {
        return {
            status: importResult.status === "OK" ? "SUCCESS" : importResult.status,
            stats: {
                imported: importResult.stats?.created ?? 0,
                updated: importResult.stats?.updated ?? 0,
                ignored: importResult.stats?.ignored ?? 0,
                deleted: importResult.stats?.deleted ?? 0,
                total: importResult.stats?.total ?? 0,
            },
            instance: this.targetInstance.toPublicObject(),
            errors: importResult.validationReport.errorReports.map(error => {
                return {
                    id: error.uid,
                    message: error.message,
                    type: error.trackerType,
                };
            }),
            date: new Date(),
            type: "events",
            response: importResult,
        };
    }

    private async push(params: DataImportParams, events: ProgramEvent[]): Promise<SynchronizationResult> {
        const eventsPostParams: TrackerPostParams = {
            idScheme: params.idScheme ?? "UID",
            dataElementIdScheme: params.dataElementIdScheme ?? "UID",
            orgUnitIdScheme: params.orgUnitIdScheme ?? "UID",
            importMode: params.importMode ?? "COMMIT",
            skipRuleEngine: params.skipRuleEngine,
        };

        const trackerPostRequest: TrackerPostRequest = {
            events: events.map(event => ({
                ...event,
                event: event.event || "",
                programStage: event.programStage ?? "",
                scheduledAt: event.scheduledAt ?? event.occurredAt ?? "",
            })),
        };

        if (params.async || params.async === undefined) {
            const { response } = await this.api.tracker.postAsync(eventsPostParams, trackerPostRequest).getData();

            const result = await this.api.system.waitFor("TRACKER_IMPORT_JOB", response.id).getData();

            if (!result) {
                return {
                    status: "ERROR",
                    instance: this.targetInstance.toPublicObject(),
                    date: new Date(),
                    type: "events",
                };
            }

            return this.cleanEventsImportResponse(result);
        } else {
            const result = await this.api.tracker.post(eventsPostParams, trackerPostRequest).getData();

            return this.cleanEventsImportResponse(result);
        }
    }

    async getEventFile(eventUid: string, dataElementUid: string, fileResourceId: string): Promise<File> {
        const blob = await this.api
            .request<Blob>({
                method: "get",
                url: `/tracker/events/${eventUid}/dataValues/${dataElementUid}/file`,
                responseDataType: "raw",
            })
            .getData();

        if (!blob) throw Error("An error has ocurred retrieving the file resource of data value");

        const fileResource = await this.api
            .get<{ name: string; contentType: string }>(`/fileResources/${fileResourceId}`)
            .getData();

        const fileName = fileResource?.name || `File.${mime.extension(fileResource.contentType)}`;

        return new File([blob], fileName, { type: fileResource.contentType });
    }

    extractEvents(response: RawEventsResponse): D2TrackerEvent[] {
        return response.instances || response.events || [];
    }
}

export function shouldScanStage(stageTotal: number, orgUnitCount: number): boolean {
    return Math.ceil(stageTotal / PAGE_SIZE) * SCAN_PAGE_COST_FACTOR < orgUnitCount;
}

export function buildSpecificEventsParams(
    apiVersion: number,
    ids: string[],
    program: string,
    programStage: string
): Record<string, string | boolean> {
    const base = { program, programStage, fields: "*" };
    return apiVersion >= 41
        ? { ...base, events: ids.join(","), paging: false }
        : { ...base, event: ids.join(";"), skipPaging: true };
}

function buildEventsPeriodFilter(params: DataSynchronizationParams): PeriodFilter {
    const { period, lastUpdated, eventsSyncPeriodField } = params;
    const { startDate, endDate } = buildPeriodFromParams(params);

    return eventsSyncPeriodField === "LAST_UPDATED"
        ? {
              updatedAfter: startDate.format("YYYY-MM-DD"),
              updatedBefore: endDate.format("YYYY-MM-DD"),
          }
        : {
              occurredAfter: period !== "ALL" ? startDate.format("YYYY-MM-DD") : undefined,
              occurredBefore:
                  period !== "ALL" && period !== "SINCE_LAST_SUCCESSFUL_SYNC"
                      ? endDate.format("YYYY-MM-DD")
                      : undefined,
              updatedAfter: lastUpdated ? moment(lastUpdated).toISOString() : undefined,
          };
}

type PeriodFilter = Partial<{
    updatedAfter: string;
    updatedBefore: string;
    occurredAfter: string;
    occurredBefore: string;
}>;

type EventsQuery = { program: string; programStage: string; orgUnit?: string } & PeriodFilter;

type RawEventsResponse = {
    pager?: { total?: number };
    total?: number;
    instances?: D2TrackerEvent[];
    events?: D2TrackerEvent[];
};
