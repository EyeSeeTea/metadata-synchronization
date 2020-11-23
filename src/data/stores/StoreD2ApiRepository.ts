import { Instance } from "../../domain/instance/entities/Instance";
import { Namespace } from "../storage/Namespaces";
import { StorageClient } from "../../domain/storage/repositories/StorageClient";
import { Store } from "../../domain/stores/entities/Store";
import { StoreRepository } from "../../domain/stores/repositories/StoreRepository";
import { StorageDataStoreClient } from "../storage/StorageDataStoreClient";
import { generateUid } from "d2/uid";

export class StoreD2ApiRepository implements StoreRepository {
    private storageClient: StorageClient;

    constructor(instance: Instance) {
        this.storageClient = new StorageDataStoreClient(instance);
    }

    public async list(): Promise<Store[]> {
        const stores = await this.storageClient.listObjectsInCollection<Store>(Namespace.STORES);
        return stores.filter(store => !store.deleted);
    }

    public async getById(id: string): Promise<Store | undefined> {
        const stores = await this.storageClient.listObjectsInCollection<Store>(Namespace.STORES);
        return stores.find(store => store.id === id);
    }

    public async delete(id: string): Promise<boolean> {
        const store = await this.storageClient.getObjectInCollection<Store>(Namespace.STORES, id);
        if (!store) return false;

        await this.storageClient.saveObjectInCollection(Namespace.STORES, {
            ...store,
            deleted: true,
        });

        return true;
    }

    public async save(store: Store): Promise<void> {
        const currentStores = await this.list();
        const isFirstStore = !store.id && currentStores.length === 0;

        await this.storageClient.saveObjectInCollection(Namespace.STORES, {
            ...store,
            id: store.id || generateUid(),
            default: isFirstStore || store.default,
        });
    }

    public async getDefault(): Promise<Store | undefined> {
        const stores = await this.list();
        return stores.find(store => store.default);
    }

    public async setDefault(id: string): Promise<void> {
        const stores = await this.list();
        const newStores = stores.map(store => ({ ...store, default: store.id === id }));
        await this.storageClient.saveObject(Namespace.STORES, newStores);
    }
}
