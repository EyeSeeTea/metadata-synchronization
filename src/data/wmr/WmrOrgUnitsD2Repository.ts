import _ from "lodash";
import { Future, FutureData } from "../../domain/common/entities/Future";
import { Id } from "../../domain/common/entities/Schemas";
import { getParentOrgUnits, WmrLevelOrgUnit, WmrOrgUnitLevel } from "../../domain/entities/wmr/entities/WmrOrgUnits";
import { wmrRequisites } from "../../domain/entities/wmr/entities/WmrRequisite";
import { WmrOrgUnitsRepository } from "../../domain/entities/wmr/repositories/WmrOrgUnitsRepository";
import { Instance } from "../../domain/instance/entities/Instance";
import { D2Api } from "../../types/d2-api";
import { getD2APiFromInstance } from "../../utils/d2-utils";
import i18n from "../../utils/i18n";
import { apiToFuture } from "../common/utils/api-futures";
import { CountryOrgUnit, getCountryOrgUnit } from "./getCountryOrgUnit";

const monthlyFormCode = wmrRequisites.countryFormMonthly.code;
const countrySyncCode = wmrRequisites.metadata.code;

const orgUnitFields = { id: true, displayName: true, level: true, path: true } as const;

type D2OrgUnit = Readonly<{ id: Id; displayName: string; level: number; path: string }>;

type D2DataSetRef = Readonly<{ id: Id; code: string; displayName: string }>;

type D2OwnerDataSet = Readonly<Record<string, unknown> & { id: Id }>;

type AssignedDataSets = Readonly<{ monthlyForm: D2DataSetRef; countrySync: D2DataSetRef }>;

type ImportErrorBody = Readonly<{
    message?: string;
    typeReports?: ReadonlyArray<{
        objectReports?: ReadonlyArray<{ errorReports?: ReadonlyArray<{ message: string }> }>;
    }>;
    response?: ImportErrorBody;
}>;

export class WmrOrgUnitsD2Repository implements WmrOrgUnitsRepository {
    private api: D2Api;
    constructor(private instance: Instance) {
        this.api = getD2APiFromInstance(this.instance);
    }

    getLevels(): FutureData<ReadonlyArray<WmrOrgUnitLevel>> {
        return Future.joinObj({
            countryOrgUnit: getCountryOrgUnit(this.api),
            levels: apiToFuture(
                this.api.models.organisationUnitLevels.get({
                    fields: { level: true, displayName: true },
                    paging: false,
                    order: "level:asc",
                })
            ),
        }).flatMap(({ countryOrgUnit, levels }) =>
            Future.parallel(
                levels.objects.map(({ level, displayName }) =>
                    this.countOrgUnitsOfLevel(countryOrgUnit, level).map(count => ({ level, name: displayName, count }))
                ),
                { concurrency: 5 }
            )
        );
    }

    getLevelOrgUnits(level: number): FutureData<ReadonlyArray<WmrLevelOrgUnit>> {
        return getCountryOrgUnit(this.api).flatMap(countryOrgUnit => this.getOrgUnitsOfLevel(countryOrgUnit, level));
    }

    getAssigned(dataSetCode: string): FutureData<ReadonlyArray<WmrLevelOrgUnit>> {
        return apiToFuture(
            this.api.models.dataSets.get({
                fields: { organisationUnits: orgUnitFields },
                filter: { code: { eq: dataSetCode } },
                paging: false,
            })
        ).map(({ objects }) => objects.flatMap(({ organisationUnits }) => organisationUnits.map(toLevelOrgUnit)));
    }

    assignLevel(level: number): FutureData<void> {
        return this.getAssignedDataSets()
            .mapError(error => toAssignError(error, [monthlyFormCode, countrySyncCode]))
            .flatMap(dataSets =>
                this.postLevelAssignment(level, dataSets).mapError(error =>
                    toAssignError(error, [dataSets.monthlyForm.displayName, dataSets.countrySync.displayName])
                )
            );
    }

    private postLevelAssignment(level: number, dataSets: AssignedDataSets): FutureData<void> {
        return getCountryOrgUnit(this.api).flatMap(countryOrgUnit =>
            Future.joinObj({
                orgUnits: this.getOrgUnitsOfLevel(countryOrgUnit, level),
                monthlyForm: this.getOwnerDataSet(dataSets.monthlyForm.id),
                countrySync: this.getOwnerDataSet(dataSets.countrySync.id),
            }).flatMap(({ orgUnits, monthlyForm, countrySync }) => {
                const parentIds = getParentOrgUnits(orgUnits).map(({ id }) => id);
                const payload = {
                    dataSets: [
                        withOrgUnits(
                            monthlyForm,
                            orgUnits.map(({ id }) => id)
                        ),
                        withOrgUnits(countrySync, _.uniq([countryOrgUnit.id, ...parentIds])),
                    ],
                };
                return apiToFuture(
                    this.api.metadata.post(payload, {
                        importStrategy: "UPDATE",
                        importMode: "COMMIT",
                        mergeMode: "REPLACE",
                        atomicMode: "ALL",
                    })
                ).flatMap(response =>
                    response.status === "OK"
                        ? Future.success(undefined)
                        : Future.error(new Error(getImportErrorReason(response) ?? response.status))
                );
            })
        );
    }

    private getAssignedDataSets(): FutureData<AssignedDataSets> {
        return apiToFuture(
            this.api.models.dataSets.get({
                fields: { id: true, code: true, displayName: true },
                filter: { code: { in: [monthlyFormCode, countrySyncCode] } },
                paging: false,
            })
        ).flatMap(({ objects }) => {
            const monthlyForm = objects.find(({ code }) => code === monthlyFormCode);
            const countrySync = objects.find(({ code }) => code === countrySyncCode);
            return monthlyForm && countrySync
                ? Future.success({ monthlyForm, countrySync })
                : Future.error(
                      new Error(
                          i18n.t("The data set {{code}} is not installed", {
                              code: monthlyForm ? countrySyncCode : monthlyFormCode,
                          })
                      )
                  );
        });
    }

    private getOwnerDataSet(id: Id): FutureData<D2OwnerDataSet> {
        return apiToFuture(this.api.get<D2OwnerDataSet>(`/dataSets/${id}`, { fields: ":owner" }));
    }

    private getOrgUnitsOfLevel(countryOrgUnit: CountryOrgUnit, level: number): FutureData<WmrLevelOrgUnit[]> {
        return apiToFuture(
            this.api.models.organisationUnits.get({
                fields: orgUnitFields,
                filter: { level: { eq: String(level) }, path: { like: countryOrgUnit.id } },
                paging: false,
            })
        ).map(({ objects }) => objects.map(toLevelOrgUnit));
    }

    private countOrgUnitsOfLevel(countryOrgUnit: CountryOrgUnit, level: number): FutureData<number> {
        return apiToFuture(
            this.api.models.organisationUnits.get({
                fields: { id: true },
                filter: { level: { eq: String(level) }, path: { like: countryOrgUnit.id } },
                pageSize: 1,
            })
        ).map(({ pager }) => pager.total);
    }
}

function toLevelOrgUnit({ id, displayName, level, path }: D2OrgUnit): WmrLevelOrgUnit {
    return { id, name: displayName, level, path };
}

function withOrgUnits(dataSet: D2OwnerDataSet, orgUnitIds: ReadonlyArray<Id>): D2OwnerDataSet {
    return { ...dataSet, organisationUnits: orgUnitIds.map(id => ({ id })) };
}

function toAssignError(error: Error, dataSetNames: ReadonlyArray<string>): Error {
    return new Error(
        i18n.t(
            "The organisation units could not be assigned: {{reason}}. Your user needs permission to edit the data sets {{dataSets}}.",
            {
                reason: getHttpErrorReason(error),
                dataSets: dataSetNames.join(", "),
                nsSeparator: false,
                interpolation: { escapeValue: false },
            }
        )
    );
}

function getHttpErrorReason(error: Error): string {
    const body = "response" in error ? _.get(error, ["response", "data"]) : undefined;
    return (isImportErrorBody(body) && getImportErrorReason(body)) || error.message;
}

function getImportErrorReason(body: ImportErrorBody): string | undefined {
    const typeReports = body.response?.typeReports ?? body.typeReports ?? [];
    const messages = typeReports.flatMap(({ objectReports = [] }) =>
        objectReports.flatMap(({ errorReports = [] }) => errorReports.map(({ message }) => message))
    );
    return messages.length > 0 ? messages.join(", ") : body.response?.message ?? body.message;
}

function isImportErrorBody(body: unknown): body is ImportErrorBody {
    return typeof body === "object" && body !== null;
}
