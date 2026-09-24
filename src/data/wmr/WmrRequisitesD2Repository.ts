import { Future, FutureData } from "../../domain/common/entities/Future";
import {
    checkWmrRequisiteDataSet,
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

const AUTOGENFORMS_NAMESPACE = "d2-autogen-forms";

type MetadataPackage = Readonly<{ dataSets: ReadonlyArray<object> }>;

export class WmrRequisitesD2Repository implements WmrRequisitesRepository {
    private api: D2Api;
    constructor(private localInstance: Instance, private targetInstance?: Instance) {
        this.api = getD2APiFromInstance(this.localInstance, this.targetInstance);
    }

    checkWmrRequisites(requisiteType: WmrRequisiteType): FutureData<WmrRequisiteCheck> {
        const { kind, code } = wmrRequisites[requisiteType];
        switch (kind) {
            case "metadata":
                return this.checkDataSet(code);
            case "dataStore":
                return this.checkDataStoreValue(code);
        }
    }

    private checkDataSet(code: string): FutureData<WmrRequisiteCheck> {
        return apiToFuture(
            this.api.models.dataSets.get({
                filter: { code: { eq: code } },
                fields: { id: true, name: true, organisationUnits: { id: true } },
            })
        ).map(({ objects: [dataSet] }) =>
            checkWmrRequisiteDataSet(dataSet && { name: dataSet.name, orgUnitsCount: dataSet.organisationUnits.length })
        );
    }

    private checkDataStoreValue(key: string): FutureData<WmrRequisiteCheck> {
        return this.getAutogenFormsClient()
            .getObjectFuture(key)
            .map(value => (value ? { type: "installed" } : { type: "missing" }));
    }

    setupRequisite(requisiteType: WmrRequisiteType): FutureData<void> {
        const { kind, code, assetPath } = wmrRequisites[requisiteType];
        switch (kind) {
            case "metadata":
                return this.setupMetadataPackage(assetPath);
            case "dataStore":
                return this.setupDataStoreValue(code, assetPath);
        }
    }

    private setupMetadataPackage(assetPath: string): FutureData<void> {
        return Future.joinObj({
            metadataPackageData: getJsonToFuture<unknown>(assetPath),
            countryOrgUnit: getCountryOrgUnit(this.api),
        }).flatMap(({ metadataPackageData, countryOrgUnit }) => {
            if (!isMetadataPackage(metadataPackageData)) {
                return Future.error(new Error("Invalid metadata package data"));
            }
            const assignedPackage = {
                ...metadataPackageData,
                dataSets: metadataPackageData.dataSets.map(dataSet => ({
                    ...dataSet,
                    organisationUnits: [{ id: countryOrgUnit.id }],
                })),
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

function isMetadataPackage(data: unknown): data is MetadataPackage {
    return typeof data === "object" && data !== null && "dataSets" in data && Array.isArray(data.dataSets);
}
