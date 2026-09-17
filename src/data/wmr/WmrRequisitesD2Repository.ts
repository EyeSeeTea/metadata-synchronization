import { Future, FutureData } from "../../domain/common/entities/Future";
import { WmrRequisiteType } from "../../domain/entities/wmr/entities/WmrRequisite";
import { WmrRequisitesRepository } from "../../domain/entities/wmr/repositories/WmrRequisitesRepository";
import { Instance } from "../../domain/instance/entities/Instance";
import { D2Api } from "../../types/d2-api";
import { getD2APiFromInstance } from "../../utils/d2-utils";
import { apiToFuture } from "../common/utils/api-futures";
import { StorageDataStoreClient } from "../storage/StorageDataStoreClient";
import { getBlobToFuture, getJsonToFuture } from "../common/utils/request-futures";
import { Id } from "../../domain/common/entities/Schemas";

const AUTOGENFORMS_NAMESPACE = "d2-autogen-forms";
const AUTOGENFORMS_MAL_WMR_KEY = "MAL_WMR_COUNTRY_SYNC";
const WMR_DOCUMENT_FILES_URL = "wmr/documentFiles.json";
const WMR_DOCUMENT_ASSETS_BASE_URL = "wmr/";
const DOCUMENT_UPLOAD_CONCURRENCY = 3;

type WmrDataSet = Record<string, unknown>;

type WmrDocument = {
    id: Id;
    name: string;
    external: boolean;
    url: string;
    attachment?: boolean;
};

type WmrMetadataPackage = {
    dataSets: WmrDataSet[];
    documents?: WmrDocument[];
    [key: string]: unknown;
};

type WmrDocumentFile = {
    documentId: Id;
    path: string;
    filename: string;
    contentType: string;
    size: number;
};

type WmrDocumentFilesManifest = {
    documents: WmrDocumentFile[];
};

export class WmrRequisitesD2Repository implements WmrRequisitesRepository {
    private api: D2Api;
    constructor(private localInstance: Instance, private targetInstance?: Instance) {
        this.api = getD2APiFromInstance(this.localInstance, this.targetInstance);
    }

    checkWmrRequisites(requisiteType: WmrRequisiteType): FutureData<boolean> {
        switch (requisiteType) {
            case "metadata":
                return this.countryDatasetExists();
            case "dataStore":
                return this.dataStoreSettingsExist();
            default:
                return Future.error(new Error(`Unknown requisiteType ${requisiteType}`));
        }
    }

    private countryDatasetExists(): FutureData<boolean> {
        // TODO: make this CODE dynamic based on the file to import?
        // TODO: check consistency with the file to import, and also check other metadata such as constants, options, etc.?
        const CODE = "MAL_WMR_COUNTRY_SYNC";
        return apiToFuture(
            this.api.models.dataSets.get({
                filter: { code: { eq: CODE } },
                fields: { id: true },
            })
        ).map(response => response.objects.length !== 0);
    }

    private dataStoreSettingsExist(): FutureData<boolean> {
        // TODO: check consistency with the file to import?
        const dataStoreClient = new StorageDataStoreClient(
            this.localInstance,
            this.targetInstance,
            AUTOGENFORMS_NAMESPACE
        );
        return dataStoreClient.getObjectFuture(AUTOGENFORMS_MAL_WMR_KEY).map(malWmrSettings => !!malWmrSettings);
    }

    setupRequisite(requisiteType: WmrRequisiteType): FutureData<void> {
        switch (requisiteType) {
            case "metadata":
                return this.setupMetadataPackage();
            case "dataStore":
                return this.setupAutogenFormsDataStoreValue();
            default:
                return Future.error(new Error(`Unknown requisiteType ${requisiteType}`));
        }
    }

    private setupMetadataPackage(): FutureData<void> {
        return Future.joinObj({
            metadataPackageData: this.fetchMetadataPackage(),
            rootOrganisationUnitId: this.getRootOrganisationUnitId(),
        }).flatMap(({ metadataPackageData, rootOrganisationUnitId }) => {
            if (!this.isValidMetadataPackage(metadataPackageData)) {
                return Future.error(new Error("Invalid metadata package data"));
            }

            const metadataWithOrganisationUnits: WmrMetadataPackage = {
                ...metadataPackageData,
                dataSets: metadataPackageData.dataSets.map(dataSet => ({
                    ...dataSet,
                    organisationUnits: [{ id: rootOrganisationUnitId }],
                })),
            };

            return this.prepareMetadataPackage(metadataWithOrganisationUnits).flatMap(metadataPackage =>
                apiToFuture(
                    this.api.metadata.post(metadataPackage, {
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
                })
            );
        });
    }

    private prepareMetadataPackage(metadataPackage: WmrMetadataPackage): FutureData<WmrMetadataPackage> {
        const documents = metadataPackage.documents ?? [];
        const internalDocuments = documents.filter(document => !document.external);

        if (internalDocuments.length === 0) return Future.success(metadataPackage);

        return this.fetchDocumentFilesManifest().flatMap(manifest => {
            const filesByDocumentId = new Map(manifest.documents.map(file => [file.documentId, file]));
            const missingDocumentFiles = internalDocuments
                .filter(document => !filesByDocumentId.has(document.id))
                .map(document => document.id);

            if (missingDocumentFiles.length > 0) {
                return Future.error(
                    new Error(`Missing bundled document files for: ${missingDocumentFiles.join(", ")}`)
                );
            }

            const uploadedDocuments = Future.parallel(
                internalDocuments.map(document =>
                    this.uploadDocumentFile(document, filesByDocumentId.get(document.id)!)
                ),
                { concurrency: DOCUMENT_UPLOAD_CONCURRENCY }
            );

            return uploadedDocuments.map(uploaded => {
                const uploadedById = new Map(uploaded.map(document => [document.id, document]));
                return {
                    ...metadataPackage,
                    documents: documents.map(document => uploadedById.get(document.id) ?? document),
                };
            });
        });
    }

    private fetchDocumentFilesManifest(): FutureData<WmrDocumentFilesManifest> {
        return getJsonToFuture<WmrDocumentFilesManifest>(WMR_DOCUMENT_FILES_URL).flatMap(manifest => {
            if (!manifest || !Array.isArray(manifest.documents)) {
                return Future.error(new Error("Invalid WMR document files manifest"));
            }
            return Future.success(manifest);
        });
    }

    private uploadDocumentFile(document: WmrDocument, file: WmrDocumentFile): FutureData<WmrDocument> {
        return getBlobToFuture(`${WMR_DOCUMENT_ASSETS_BASE_URL}${file.path}`).flatMap(blob => {
            if (blob.size !== file.size) {
                return Future.error(
                    new Error(`Bundled document file ${file.path} has size ${blob.size}, expected ${file.size}`)
                );
            }

            const documentBlob = new Blob([blob], { type: file.contentType });
            return apiToFuture(
                this.api.files.saveFileResource({
                    name: file.filename,
                    data: documentBlob,
                    domain: "DOCUMENT",
                })
            ).map(fileResourceId => ({ ...document, url: fileResourceId }));
        });
    }

    private setupAutogenFormsDataStoreValue(): FutureData<void> {
        return this.fetchAutogenFormsDataStoreValue().flatMap(autogenFormsDataStoreData => {
            const dataStoreClient = new StorageDataStoreClient(
                this.localInstance,
                this.targetInstance,
                AUTOGENFORMS_NAMESPACE
            );
            return dataStoreClient.saveObjectFuture(AUTOGENFORMS_MAL_WMR_KEY, autogenFormsDataStoreData);
        });
    }

    private fetchMetadataPackage(): FutureData<WmrMetadataPackage> {
        const WMR_METADATA_URL = "wmr/metadata.json";
        return getJsonToFuture<WmrMetadataPackage>(WMR_METADATA_URL);
    }

    private fetchAutogenFormsDataStoreValue(): FutureData<object> {
        const WMR_AUTOGEN_DATASTORE_URL = "wmr/dataStore.json";
        return getJsonToFuture(WMR_AUTOGEN_DATASTORE_URL);
    }

    private getRootOrganisationUnitId(): FutureData<Id> {
        return apiToFuture(
            this.api.models.organisationUnits.get({
                paging: false,
                filter: { level: { eq: "1" } },
                fields: { id: true },
            })
        ).map(response => {
            if (response.objects.length === 0) {
                throw new Error("No root organisation unit found");
            }
            return response.objects[0].id;
        });
    }

    private isValidMetadataPackage(data: unknown): data is WmrMetadataPackage {
        return !!data && typeof data === "object" && Array.isArray((data as any)?.dataSets);
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
