import _ from "lodash";
import { Instance } from "../../domain/instance/entities/Instance";
import { ObjectSharing, StorageClient } from "../../domain/storage/repositories/StorageClient";
import { D2Api, DataStore } from "../../types/d2-api";
import { Dictionary } from "../../types/utils";
import { promiseMap } from "../../utils/common";
import { getD2APiFromInstance } from "../../utils/d2-utils";

export const dataStoreNamespace = "metadata-synchronization";

export class StorageDataStoreClient extends StorageClient {
    public type = "dataStore" as const;

    private api: D2Api;
    private dataStore: DataStore;

    constructor(instance: Instance) {
        super();
        this.api = getD2APiFromInstance(instance);
        this.dataStore = this.api.dataStore(dataStoreNamespace);
    }

    public async getObject<T extends object>(key: string): Promise<T | undefined> {
        const value = await this.dataStore.get<T>(key).getData();
        return value;
    }

    public async getOrCreateObject<T extends object>(key: string, defaultValue: T): Promise<T> {
        const value = await this.getObject<T>(key);
        if (!value) await this.saveObject(key, defaultValue);
        return value ?? defaultValue;
    }

    public async saveObject<T extends object>(key: string, value: T): Promise<void> {
        await this.dataStore.save(key, value).getData();
    }

    public async removeObject(key: string): Promise<void> {
        try {
            await this.dataStore.delete(key).getData();
        } catch (error) {
            if (!error.response || error.response.status !== 404) {
                throw error;
            }
        }
    }

    public async clearStorage(): Promise<void> {
        const keys = await this.dataStore.getKeys().getData();
        await promiseMap(keys, key => this.removeObject(key));
    }

    public async clone(): Promise<Dictionary<unknown>> {
        const keys = await this.dataStore.getKeys().getData();

        const pairs = await promiseMap(keys, async key => {
            const value = await this.getObject(key);
            return [key, value];
        });

        return _.fromPairs(pairs);
    }

    public async import(dump: Dictionary<unknown>): Promise<void> {
        const pairs = _.toPairs(dump);

        await promiseMap(pairs, async ([key, value]) => {
            await this.saveObject(key, value as object);
        });
    }

    public async listKeys(): Promise<string[]> {
        return this.dataStore.getKeys().getData();
    }

    public async getObjectSharing(key: string): Promise<ObjectSharing | undefined> {
        const {
            user,
            userAccesses,
            userGroupAccesses,
            publicAccess,
            externalAccess,
        } = await this.getMetadataByKey(key);

        return {
            user: { ...user, name: "" },
            userAccesses,
            userGroupAccesses,
            publicAccess,
            externalAccess,
        };
    }

    public async saveObjectSharing(key: string, object: ObjectSharing): Promise<void> {
        const { id } = await this.getMetadataByKey(key);
        await this.api.post(`/sharing`, { type: "dataStore", id }, { object }).getData();
    }

    private async getMetadataByKey(key: string) {
        const data = await this.api
            .get<MetadataDataStoreKey>(`/dataStore/${dataStoreNamespace}/${key}/metaData`)
            .getData();

        return data;
    }
}

export interface MetadataDataStoreKey extends ObjectSharing {
    created: Date;
    lastUpdated: Date;
    lastUpdatedBy: { id: string };
    namespace: string;
    key: string;
    value: string;
    favorite: boolean;
    id: boolean;
}
