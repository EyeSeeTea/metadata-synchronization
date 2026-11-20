import { FutureData } from "../../domain/common/entities/Future";
import { emptyWmrUserSettings, WmrUserSettings } from "../../domain/entities/wmr/entities/WmrUserSettings";
import { WmrUserSettingsRepository } from "../../domain/entities/wmr/repositories/WmrUserSettingsRepository";
import { Instance } from "../../domain/instance/entities/Instance";
import { Namespace } from "../storage/Namespaces";
import { StorageDataStoreClient } from "../storage/StorageDataStoreClient";

export class WmrUserSettingsD2Repository implements WmrUserSettingsRepository {
    private dataStoreClient: StorageDataStoreClient;

    constructor(instance: Instance) {
        this.dataStoreClient = new StorageDataStoreClient(instance);
    }

    get(): FutureData<WmrUserSettings> {
        return this.dataStoreClient
            .getObjectFuture<WmrUserSettings>(Namespace.WMR_SETTINGS)
            .map(settings => settings ?? emptyWmrUserSettings);
    }

    save(settings: WmrUserSettings): FutureData<void> {
        return this.dataStoreClient.saveObjectFuture<WmrUserSettings>(Namespace.WMR_SETTINGS, settings);
    }
}
