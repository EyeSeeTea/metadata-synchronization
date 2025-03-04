import { Settings, SettingsData } from "../../domain/settings/Settings";
import { SettingsRepository } from "../../domain/settings/SettingsRepository";
import { StorageClientRepository } from "../../domain/storage-client-config/repositories/StorageClientRepository";
import { StorageClient } from "../../domain/storage/repositories/StorageClient";
import { Namespace } from "../storage/Namespaces";

export class SettingsD2ApiRepository implements SettingsRepository {
    constructor(private storageClientRepository: StorageClientRepository) {}

    async get(): Promise<Settings> {
        const storageClient = await this.getStorageClient();
        const settingsData = await storageClient.getObject<SettingsData>(Namespace.SETTINGS);

        const historyRetentionDays = settingsData ? settingsData.historyRetentionDays?.toString() : undefined;

        const settings = Settings.create({
            historyRetentionDays: historyRetentionDays,
        }).match({
            success: settings => {
                return settings;
            },
            error: errors => {
                throw new Error(errors.join(", "));
            },
        });

        return settings;
    }

    async save(settings: Settings): Promise<void> {
        const data = {
            historyRetentionDays: settings.historyRetentionDays,
        };

        const storageClient = await this.getStorageClient();
        await storageClient.saveObject<SettingsData>(Namespace.SETTINGS, data);
    }

    private getStorageClient(): Promise<StorageClient> {
        return this.storageClientRepository.getStorageClient();
    }
}
