import _ from "lodash";
import { Request, Server } from "miragejs";
import { AnyRegistry } from "miragejs/-types";
import Schema from "miragejs/orm/schema";
import { DynamicRepositoryFactory } from "../../../../domain/common/factories/DynamicRepositoryFactory";
import { EventsSyncUseCase } from "../../../../domain/events/usecases/EventsSyncUseCase";
import { Instance } from "../../../../domain/instance/entities/Instance";
import { SynchronizationBuilder } from "../../../../domain/synchronization/entities/SynchronizationBuilder";
import { startDhis } from "../../../../utils/dhisServer";
import { registerDynamicRepositoriesInFactory } from "../../../../presentation/CompositionRoot";
import { EventsPayloadBuilder } from "../../../../domain/events/builders/EventsPayloadBuilder";
import { AggregatedPayloadBuilder } from "../../../../domain/aggregated/builders/AggregatedPayloadBuilder";
import { AggregatedDataExchangeApiExecutor } from "../../../aggregated/AggregatedDataExchangeApiExecutor";

const localInstance = Instance.build({
    url: "http://origin.test",
    name: "Testing",
    version: "2.40",
    type: "local",
});
const repositoryFactory = buildRepositoryFactory(localInstance);

const UNSELECTED_ORG_UNIT = "NotSelected";

function buildEvent(event: string, orgUnit: string) {
    return {
        storedBy: "widp.admin",
        scheduledAt: "2020-04-11T00:00:02.846",
        program: "program1",
        event,
        programStage: "EGA9fqLFtxM",
        orgUnit,
        status: "ACTIVE",
        orgUnitName: orgUnit,
        occurredAt: "2020-04-11T00:00:00.000",
        attributeCategoryOptions: "Y7fcspgsU43",
        updatedAt: "2020-06-09T07:06:35.514",
        createdAt: "2020-06-09T07:06:35.513",
        deleted: false,
        attributeOptionCombo: "Xr12mI7VPn3",
        dataValues: [
            {
                updatedAt: "2020-06-09T07:06:35.515",
                storedBy: "widp.admin",
                createdAt: "2020-06-09T07:06:35.515",
                dataElement: "id1",
                value: "true",
                providedElsewhere: false,
            },
        ],
        notes: [],
    };
}

describe("Sync events", () => {
    let local: Server;
    let eventRequests: Request["queryParams"][];
    let stageTotal: number;

    beforeEach(() => {
        eventRequests = [];
        stageTotal = 1;
        local = startDhis({ urlPrefix: "http://origin.test" });

        local.get("/categoryOptionCombos", async () => ({
            categoryOptionCombos: [
                {
                    name: "default",
                    id: "default8",
                    categoryCombo: { id: "default7" },
                    categoryOptions: [{ id: "default5" }],
                },
            ],
        }));

        local.get("/routes/DESTINATION/run/api/categoryOptionCombos", async () => ({
            categoryOptionCombos: [
                {
                    name: "default",
                    id: "default4",
                    categoryCombo: { id: "default3" },
                    categoryOptions: [{ id: "default1" }],
                },
            ],
        }));

        local.get("/metadata", async (_schema, request) => {
            if (request.queryParams.filter === "id:in:[program1]") {
                return {
                    programs: [
                        {
                            name: "Test program",
                            id: "program1",
                            programStages: [
                                {
                                    id: "EGA9fqLFtxM",
                                    programStageDataElements: [
                                        {
                                            dataElement: {
                                                name: "Test data element",
                                                id: "id1",
                                                displayFormName: "Test data element",
                                            },
                                        },
                                    ],
                                },
                            ],
                            programIndicators: [],
                        },
                    ],
                };
            } else if (request.queryParams.filter === "identifiable:eq:default") {
                return {
                    categoryOptions: [{ id: "default1" }],
                    categories: [{ id: "default2" }],
                    categoryCombos: [{ id: "default3" }],
                    categoryOptionCombos: [{ id: "default4" }],
                };
            } else if (request.queryParams.filter === "id:in:[id1]") {
                return {
                    dataElements: [{ id: "id1", valueType: "TEXT" }],
                };
            } else {
                console.error("Unknown metadata request", request.queryParams);
            }
        });

        local.get("/dataValueSets", async () => ({ dataValues: [] }));
        local.get("/routes/DESTINATION/run/api/dataValueSets", async () => ({ dataValues: [] }));

        local.get("/tracker/events", async (_schema, request) => {
            const { program, orgUnit, pageSize } = request.queryParams;
            if (!program) {
                throw new Error("Missing required 'program' query param in /tracker/events request");
            }

            eventRequests.push(request.queryParams);

            const matchingEvents = [
                buildEvent("test-event-1", "Global"),
                buildEvent("test-event-3", UNSELECTED_ORG_UNIT),
            ].filter(event => !orgUnit || event.orgUnit === orgUnit);

            const isCountRequest = pageSize === "1";

            return {
                pager: { page: 1, pageCount: 1, pageSize: Number(pageSize), total: stageTotal },
                instances: isCountRequest ? matchingEvents.slice(0, 1) : matchingEvents,
            };
        });

        local.get("/routes/DESTINATION/run/api/tracker/events", async () => ({
            page: 1,
            pageCount: 1,
            pageSize: 1,
            total: 1,
            instances: [
                {
                    storedBy: "widp.admin",
                    scheduledAt: "2020-04-11T00:00:02.846",
                    program: "program1",
                    event: "test-event-2",
                    programStage: "EGA9fqLFtxM",
                    orgUnit: "Global",
                    status: "ACTIVE",
                    orgUnitName: "Global",
                    occurredAt: "2020-04-11T00:00:00.000",
                    attributeCategoryOptions: "Y7fcspgsU43",
                    updatedAt: "2020-06-09T07:06:35.514",
                    createdAt: "2020-06-09T07:06:35.513",
                    deleted: false,
                    attributeOptionCombo: "Xr12mI7VPn3",
                    dataValues: [
                        {
                            updatedAt: "2020-06-09T07:06:35.515",
                            storedBy: "widp.admin",
                            createdAt: "2020-06-09T07:06:35.515",
                            dataElement: "id1",
                            value: "true",
                            providedElsewhere: false,
                        },
                    ],
                    notes: [],
                },
            ],
        }));

        local.get("/routes/DESTINATION/run/api/metadata", async () => ({
            categoryOptions: [{ id: "default5" }],
            categories: [{ id: "default6" }],
            categoryCombos: [{ id: "default7" }],
            categoryOptionCombos: [{ id: "default8" }],
            dataElements: [{ id: "id2", name: "Test data element 2" }],
        }));

        local.get("/dataStore/metadata-synchronization/instances", async () => [
            {
                id: "DESTINATION",
            },
        ]);

        local.get("/routes", async () => ({
            routes: [
                {
                    id: "DESTINATION",
                    name: "Destination test",
                    url: "http://destination.test",
                    username: "test",
                    auth: { type: "http-basic", username: "test", password: "" },
                    description: "",
                    sharing: {
                        external: false,
                        owner: "H4atNsEuKxP",
                        public: "rw------",
                        users: {},
                        userGroups: {},
                    },
                },
            ],
        }));

        local.get("/routes/DESTINATION/run/api/system/info", () => ({ version: "2.36" }));

        local.get("/dataStore/metadata-synchronization/mappings", async () => []);

        local.get("/sharing", async () => ({
            meta: {
                allowPublicAccess: true,
                allowExternalAccess: false,
            },
            object: {
                id: "Db5532sXKXT",
                publicAccess: "rw------",
                user: { id: "H4atNsEuKxP" },
                userGroupAccesses: [],
                userAccesses: [],
                externalAccess: false,
            },
        }));

        local.get("/sharing", async () => ({
            meta: {
                allowPublicAccess: true,
                allowExternalAccess: false,
            },
            object: {
                id: "Db5532sXKX1",
                externalAccess: false,
                publicAccess: "rw------",
                user: { id: "H4atNsEuKxP" },
                userGroupAccesses: [],
                userAccesses: [],
            },
        }));

        // local.get("/trackedEntityInstances", async () => ({
        //     trackedEntityInstances: [],
        // }));

        const addEventsToDb = async (schema: Schema<AnyRegistry>, request: Request, collection: string) => {
            const body = JSON.parse(request.requestBody);
            schema.db[collection].insert(body);

            return {
                status: "OK",
                validationReport: {
                    errorReports: [],
                    warningReports: [],
                },
                stats: {
                    created: 1,
                    updated: 0,
                    deleted: 0,
                    ignored: 0,
                    total: 1,
                },
                bundleReport: {
                    typeReportMap: {
                        EVENT: {
                            trackerType: "EVENT",
                            stats: {
                                created: 1,
                                updated: 0,
                                deleted: 0,
                                ignored: 0,
                                total: 1,
                            },
                            objectReports: [
                                {
                                    trackerType: "EVENT",
                                    uid: body.events[0].event,
                                    errorReports: [],
                                },
                            ],
                        },
                    },
                },
            };
        };

        local.db.createCollection("eventsLocal", []);
        local.post("/tracker", (schema, request) => addEventsToDb(schema, request, "eventsLocal"));

        local.db.createCollection("eventsDestination", []);
        local.post("/routes/DESTINATION/run/api/tracker", (schema, request) =>
            addEventsToDb(schema, request, "eventsDestination")
        );
    });

    afterEach(() => {
        local.shutdown();
    });

    it("Local server to remote - same version", async () => {
        const builder: SynchronizationBuilder = {
            originInstance: "LOCAL",
            targetInstances: ["DESTINATION"],
            metadataIds: ["program1"],
            excludedIds: [],
            dataParams: {
                allEvents: true,
                orgUnitPaths: ["/Global"],
            },
        };

        const eventsPayloadBuilder = new EventsPayloadBuilder(repositoryFactory, localInstance);
        const aggregatedPayloadBuilder = new AggregatedPayloadBuilder(repositoryFactory, localInstance);
        const aggregatedDataExchangeExecutor = new AggregatedDataExchangeApiExecutor(localInstance);

        const sync = new EventsSyncUseCase(
            builder,
            repositoryFactory,
            localInstance,
            eventsPayloadBuilder,
            aggregatedPayloadBuilder,
            aggregatedDataExchangeExecutor
        );

        const payload = await eventsPayloadBuilder.build(builder);

        expect(payload.events?.find(({ id }) => id === "test-event-1")).toBeDefined();

        for await (const _sync of sync.execute()) {
            // no-op
        }

        const response = local.db.eventsDestination.find(1);
        expect(response.events[0].id).toEqual("test-event-1");
        expect(local.db.eventsLocal.find(1)).toBeNull();
    });

    it("Remote server to local - same version", async () => {
        const builder: SynchronizationBuilder = {
            originInstance: "DESTINATION",
            targetInstances: ["LOCAL"],
            metadataIds: ["program1"],
            excludedIds: [],
            dataParams: {
                allEvents: true,
                orgUnitPaths: ["/Global"],
            },
        };
        const eventsPayloadBuilder = new EventsPayloadBuilder(repositoryFactory, localInstance);
        const aggregatedPayloadBuilder = new AggregatedPayloadBuilder(repositoryFactory, localInstance);
        const aggregatedDataExchangeExecutor = new AggregatedDataExchangeApiExecutor(localInstance);

        const sync = new EventsSyncUseCase(
            builder,
            repositoryFactory,
            localInstance,
            eventsPayloadBuilder,
            aggregatedPayloadBuilder,
            aggregatedDataExchangeExecutor
        );

        const payload = await eventsPayloadBuilder.build(builder);

        expect(payload.events?.find(({ id }) => id === "test-event-2")).toBeDefined();

        for await (const _sync of sync.execute()) {
            // no-op
        }

        const response = local.db.eventsLocal.find(1);
        expect(response.events[0].id).toEqual("test-event-2");
        expect(local.db.eventsDestination.find(1)).toBeNull();
    });

    describe("Many org units selected", () => {
        const SELECTED_ORG_UNITS = ["Global", ..._.range(1, 30).map(index => `orgUnit${index}`)];
        const SCAN_TOTAL = 1;
        const PER_ORG_UNIT_TOTAL = 100000;

        const buildPayload = () => {
            const builder: SynchronizationBuilder = {
                originInstance: "LOCAL",
                targetInstances: ["DESTINATION"],
                metadataIds: ["program1"],
                excludedIds: [],
                dataParams: {
                    allEvents: true,
                    orgUnitPaths: SELECTED_ORG_UNITS.map(id => `/Global/${id}`),
                },
            };

            return new EventsPayloadBuilder(repositoryFactory, localInstance).build(builder);
        };

        const dataRequests = () => eventRequests.filter(({ pageSize }) => pageSize !== "1");
        const countRequests = () => eventRequests.filter(({ pageSize }) => pageSize === "1");

        it("scans the program stage and drops events of unselected org units when it is cheaper", async () => {
            stageTotal = SCAN_TOTAL;

            const payload = await buildPayload();

            expect(payload.events?.map(({ id }) => id)).toEqual(["test-event-1"]);
            expect(countRequests().map(({ program, programStage }) => ({ program, programStage }))).toEqual([
                { program: "program1", programStage: "EGA9fqLFtxM" },
            ]);
            expect(
                dataRequests().map(({ program, programStage, orgUnit }) => ({ program, programStage, orgUnit }))
            ).toEqual([{ program: "program1", programStage: "EGA9fqLFtxM", orgUnit: undefined }]);
        });

        it("queries each org unit separately when scanning the stage is more expensive", async () => {
            stageTotal = PER_ORG_UNIT_TOTAL;

            const payload = await buildPayload();

            expect(payload.events?.map(({ id }) => id)).toEqual(["test-event-1"]);
            expect(countRequests()).toHaveLength(1);
            expect(_.sortBy(dataRequests().map(({ orgUnit }) => orgUnit))).toEqual(_.sortBy(SELECTED_ORG_UNITS));
            expect(_.uniq(dataRequests().map(({ program, programStage }) => `${program}/${programStage}`))).toEqual([
                "program1/EGA9fqLFtxM",
            ]);
        });

        it("skips fetching a program stage without events", async () => {
            stageTotal = 0;

            const payload = await buildPayload();

            expect(payload.events).toEqual([]);
            expect(countRequests()).toHaveLength(1);
            expect(dataRequests()).toEqual([]);
        });
    });

    describe("Specific events selected", () => {
        it("keeps only the requested events even if the server ignores the id filter", async () => {
            local.get("/tracker/events", async (_schema, request) => {
                eventRequests.push(request.queryParams);
                return { instances: [buildEvent("test-event-1", "Global"), buildEvent("test-event-4", "Global")] };
            });

            const builder: SynchronizationBuilder = {
                originInstance: "LOCAL",
                targetInstances: ["DESTINATION"],
                metadataIds: ["program1"],
                excludedIds: [],
                dataParams: { allEvents: false, events: ["test-event-1"], orgUnitPaths: ["/Global"] },
            };

            const payload = await new EventsPayloadBuilder(repositoryFactory, localInstance).build(builder);

            expect(payload.events?.map(({ id }) => id)).toEqual(["test-event-1"]);
            expect(eventRequests.map(({ event, skipPaging }) => ({ event, skipPaging }))).toEqual([
                { event: "test-event-1", skipPaging: "true" },
            ]);
        });
    });
});

function buildRepositoryFactory(localInstance: Instance) {
    const repositoryFactory: DynamicRepositoryFactory = new DynamicRepositoryFactory();

    registerDynamicRepositoriesInFactory(localInstance, repositoryFactory);

    return repositoryFactory;
}

export {};
