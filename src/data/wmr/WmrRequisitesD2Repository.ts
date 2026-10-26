import { Future, FutureData } from "../../domain/common/entities/Future";
import {
    checkWmrRequisiteDataSet,
    WmrRequisite,
    WmrRequisiteCheck,
    WmrRequisiteType,
    wmrRequisites,
} from "../../domain/entities/wmr/entities/WmrRequisite";
import { WmrRequisitesRepository } from "../../domain/entities/wmr/repositories/WmrRequisitesRepository";
import { Instance } from "../../domain/instance/entities/Instance";
import { D2Api } from "../../types/d2-api";
import { getD2APiFromInstance } from "../../utils/d2-utils";
import { apiToFuture } from "../common/utils/api-futures";
import { StorageDataStoreClient } from "../storage/StorageDataStoreClient";
import { getJsonToFuture } from "../common/utils/request-futures";
import { getCountryOrgUnit } from "./getCountryOrgUnit";
import { generateUid } from "d2/uid";

const AUTOGENFORMS_NAMESPACE = "d2-autogen-forms";

type MetadataPackage = Readonly<{ dataSets: ReadonlyArray<object> }>;
type D2DataSetOwner = Readonly<Record<string, unknown> & { id: string }>;

export class WmrRequisitesD2Repository implements WmrRequisitesRepository {
    private api: D2Api;
    constructor(private localInstance: Instance, private targetInstance?: Instance) {
        this.api = getD2APiFromInstance(this.localInstance, this.targetInstance);
    }

    checkWmrRequisites(requisiteType: WmrRequisiteType): FutureData<WmrRequisiteCheck> {
        const requisite = wmrRequisites[requisiteType];
        switch (requisite.kind) {
            case "metadata":
                return this.checkDataSet(requisite);
            case "dataStore":
                return this.checkDataStoreValue(requisite.code);
        }
    }

    private checkDataSet({ code, assignToCountry }: WmrRequisite): FutureData<WmrRequisiteCheck> {
        return Future.joinObj({
            dataSets: apiToFuture(
                this.api.models.dataSets.get({
                    filter: { code: { eq: code } },
                    fields: { id: true, name: true, organisationUnits: { id: true } },
                })
            ),
            countryOrgUnit: getCountryOrgUnit(this.api),
        }).map(({ dataSets, countryOrgUnit }) => {
            const [dataSet] = dataSets.objects;
            return checkWmrRequisiteDataSet(
                dataSet && { name: dataSet.name, orgUnitIds: dataSet.organisationUnits.map(({ id }) => id) },
                countryOrgUnit.id,
                assignToCountry
            );
        });
    }

    private checkDataStoreValue(key: string): FutureData<WmrRequisiteCheck> {
        return this.getAutogenFormsClient()
            .getObjectFuture(key)
            .map(value => (value ? { type: "installed" } : { type: "missing" }));
    }

    setupRequisite(requisiteType: WmrRequisiteType): FutureData<void> {
        const requisite = wmrRequisites[requisiteType];
        if (requisiteType === "regionalMonthlyStaging") return this.setupRegionalMonthlyStaging();
        switch (requisite.kind) {
            case "metadata":
                return this.setupMetadataPackage(requisite);
            case "dataStore":
                return this.setupDataStoreValue(requisite.code, requisite.assetPath);
        }
    }

    private setupRegionalMonthlyStaging(): FutureData<void> {
        const annualCode = wmrRequisites.metadata.code;
        const monthlyCode = wmrRequisites.regionalMonthlyStaging.code;
        return apiToFuture(
            this.api.models.dataSets.get({
                fields: { id: true },
                filter: { code: { eq: annualCode } },
                paging: false,
            })
        ).flatMap(({ objects }) => {
            const annual = objects[0];
            if (!annual) {
                return Future.error(new Error(`The data set ${annualCode} is not installed`));
            }
            return apiToFuture(this.api.get<D2DataSetOwner>(`/dataSets/${annual.id}`, { fields: ":owner" })).flatMap(
                annualDataSet =>
                    apiToFuture(
                        this.api.metadata.post(
                            { dataSets: [buildRegionalMonthlyStagingDataSet(annualDataSet, monthlyCode)] },
                            {
                                importStrategy: "CREATE",
                                importMode: "COMMIT",
                                atomicMode: "ALL",
                            }
                        )
                    ).flatMap(importResponse =>
                        importResponse.status === "OK"
                            ? Future.success(undefined)
                            : Future.error(new Error("Failed to create the regional monthly staging data set"))
                    )
            );
        });
    }

    private setupMetadataPackage({ assetPath, assignToCountry }: WmrRequisite): FutureData<void> {
        return Future.joinObj({
            metadataPackageData: getJsonToFuture<unknown>(assetPath),
            countryOrgUnit: getCountryOrgUnit(this.api),
        }).flatMap(({ metadataPackageData, countryOrgUnit }) => {
            if (!isMetadataPackage(metadataPackageData)) {
                return Future.error(new Error("Invalid metadata package data"));
            }
            const assignedPackage = {
                ...metadataPackageData,
                dataSets: metadataPackageData.dataSets.map(dataSet =>
                    assignToCountry ? { ...dataSet, organisationUnits: [{ id: countryOrgUnit.id }] } : dataSet
                ),
            };
            return apiToFuture(
                this.api.metadata.post(assignedPackage, {
                    importStrategy: "CREATE_AND_UPDATE",
                    importMode: "COMMIT",
                    atomicMode: "ALL",
                    mergeMode: "REPLACE",
                })
            ).flatMap(importResponse => {
                if (importResponse.status !== "OK") {
                    console.error("Failed to import metadata package:", importResponse);
                    return Future.error(new Error(`Failed to import the metadata package`));
                }
                return Future.success(undefined);
            });
        });
    }

    private setupDataStoreValue(key: string, assetPath: string): FutureData<void> {
        return getJsonToFuture<object>(assetPath).flatMap(value =>
            this.getAutogenFormsClient().saveObjectFuture(key, value)
        );
    }

    private getAutogenFormsClient(): StorageDataStoreClient {
        return new StorageDataStoreClient(this.localInstance, this.targetInstance, AUTOGENFORMS_NAMESPACE);
    }

    validateOrgUnit(orgUnitId: string): FutureData<boolean> {
        return apiToFuture(
            this.api.models.organisationUnits.get({
                filter: { id: { eq: orgUnitId } },
                fields: { id: true },
            })
        ).map(response => response.objects.length > 0);
    }
}

function buildRegionalMonthlyStagingDataSet(annualDataSet: D2DataSetOwner, code: string): D2DataSetOwner {
    const {
        id: _id,
        code: _code,
        name: _name,
        displayName: _displayName,
        shortName: _shortName,
        periodType: _periodType,
        organisationUnits: _organisationUnits,
        version: _version,
        created: _created,
        lastUpdated: _lastUpdated,
        ...references
    } = annualDataSet;
    const id = generateUid();
    const dataSetElements = annualDataSet.dataSetElements as Array<Record<string, unknown>> | undefined;
    return {
        ...references,
        id,
        code,
        name: "MAL - WMR Regional Monthly Sync",
        shortName: "WMR Regional Monthly Sync",
        periodType: "Monthly",
        dataSetElements: dataSetElements?.map(dataSetElement => ({
            ...dataSetElement,
            dataSet: { id },
        })),
        organisationUnits: [],
    };
}

function isMetadataPackage(data: unknown): data is MetadataPackage {
    return typeof data === "object" && data !== null && "dataSets" in data && Array.isArray(data.dataSets);
}
