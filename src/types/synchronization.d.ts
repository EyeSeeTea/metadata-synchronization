export interface SynchronizationBuilder {
    targetInstances: string[];
    originInstance: string;
    metadata: {
        [metadataType: string]: string[];
    };
}

export interface SynchronizationResult {
    [metadataType: string]: any[];
}

export interface NestedRules {
    [metadataType: string]: string[];
}
