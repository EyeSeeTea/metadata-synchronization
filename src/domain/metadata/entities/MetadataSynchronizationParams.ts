import { MetadataIncludeExcludeRules } from "./MetadataExcludeIncludeRules";

export interface MetadataImportParams {
    atomicMode?: "ALL" | "NONE";
    flushMode?: "AUTO" | "OBJECT";
    identifier?: "UID" | "CODE" | "AUTO";
    importMode?: "COMMIT" | "VALIDATE";
    importStrategy?: "CREATE_AND_UPDATE" | "CREATE" | "UPDATE" | "DELETE";
    importReportMode?: "ERRORS" | "FULL" | "DEBUG";
    mergeMode?: "MERGE" | "REPLACE";
    preheatMode?: "REFERENCE" | "ALL" | "NONE";
    skipSharing?: boolean;
    skipValidation?: boolean;
    userOverrideMode?: "NONE" | "CURRENT" | "SELECTED";
    username?: string;
}

export interface MetadataSynchronizationParams extends MetadataImportParams {
    enableMapping: boolean;
    useDefaultIncludeExclude: boolean;
    metadataIncludeExcludeRules?: MetadataIncludeExcludeRules;
    metadataModelsSyncAll: string[]; //TODO: keyof MetadataEntities 963#discussion_r1682370900
    includeSharingSettingsObjectsAndReferences: boolean;
    includeOnlySharingSettingsReferences: boolean;
    includeUsersObjectsAndReferences: boolean;
    includeOnlyUsersReferences: boolean;
    includeOrgUnitsObjectsAndReferences: boolean;
    includeOnlyOrgUnitsReferences: boolean;
    removeDefaultCategoryObjects?: boolean;
    removeUserNonEssentialObjects?: boolean;
}
