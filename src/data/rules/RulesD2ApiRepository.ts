import JSZip from "jszip";
import _ from "lodash";
import { Either } from "../../domain/common/entities/Either";
import { ConfigRepository } from "../../domain/config/repositories/ConfigRepository";
import {
    SynchronizationRule,
    SynchronizationRuleData,
} from "../../domain/rules/entities/SynchronizationRule";
import { RulesRepository } from "../../domain/rules/repositories/RulesRepository";
import { StorageClient } from "../../domain/storage/repositories/StorageClient";
import { UserRepository } from "../../domain/user/repositories/UserRepository";
import i18n from "../../locales";
import { decodeModel } from "../../utils/codec";
import { promiseMap } from "../../utils/common";
import { Namespace } from "../storage/Namespaces";
import { SynchronizationRuleModel } from "./models/SynchronizationRuleModel";

export class RulesD2ApiRepository implements RulesRepository {
    constructor(
        private configRepository: ConfigRepository,
        private userRepository: UserRepository
    ) {}

    public async readFiles(files: File[]): Promise<Either<string, SynchronizationRule>[]> {
        const user = await this.userRepository.getCurrent();

        // Rules can be either JSON files or zip files with multiple JSON files
        const items: Either<string, SynchronizationRuleData>[] = await promiseMap(
            files,
            async file => {
                if (file.type === "application/json") {
                    try {
                        const data = await file.text();
                        const payload = JSON.parse(data);
                        return payload;
                    } catch (error) {
                        return undefined;
                    }
                }

                const zip = new JSZip();
                const contents = await zip.loadAsync(file);
                const modulePaths = this.getModulePaths(contents);

                return promiseMap(modulePaths, async modulePath =>
                    this.getJsonFromFile(zip, modulePath)
                );
            }
        );

        const rules = _(items)
            .compact()
            .flatten()
            .map(result =>
                result.map(data =>
                    SynchronizationRule.build(data).update({ created: new Date(), user })
                )
            )
            .value();

        return rules;
    }

    public async getById(id: string): Promise<SynchronizationRule | undefined> {
        const storageClient = await this.getStorageClient();
        const data = await storageClient.getObjectInCollection<SynchronizationRuleData>(
            Namespace.RULES,
            id
        );

        return data ? SynchronizationRule.build(data) : undefined;
    }

    public async getSyncResults(id: string): Promise<SynchronizationRule[]> {
        const storageClient = await this.getStorageClient();
        const data = await storageClient.getObject<SynchronizationRule[]>(
            `${Namespace.RULES}-${id}`
        );

        return data ?? [];
    }

    public async list(): Promise<SynchronizationRule[]> {
        const storageClient = await this.getStorageClient();
        const stores = await storageClient.listObjectsInCollection<SynchronizationRuleData>(
            Namespace.RULES
        );

        return stores.map(data => SynchronizationRule.build(data));
    }

    public async save(rules: SynchronizationRule[]): Promise<void> {
        const user = await this.userRepository.getCurrent();
        const data = rules.map(rule =>
            rule
                .update({
                    lastUpdated: new Date(),
                    lastUpdatedBy: { id: user.id, name: user.name },
                })
                .toObject()
        );

        const storageClient = await this.getStorageClient();
        await storageClient.saveObjectsInCollection<SynchronizationRuleData>(Namespace.RULES, data);
    }

    public async delete(id: string): Promise<void> {
        const storageClient = await this.getStorageClient();
        await storageClient.removeObjectInCollection(Namespace.RULES, id);
    }

    private getStorageClient(): Promise<StorageClient> {
        return this.configRepository.getStorageClient();
    }

    private async getJsonFromFile(
        zip: JSZip,
        filename: string
    ): Promise<Either<string, SynchronizationRuleData>> {
        const obj = zip.file(filename);
        if (!obj) return Either.error(i18n.t("Couldn't read file"));
        const blob = await obj.async("blob");
        const text = await blob.text();
        return decodeModel(SynchronizationRuleModel, text).mapError(
            error => `${filename}: ${error}`
        );
    }

    private getModulePaths(contents: JSZip) {
        return _(contents.files)
            .pickBy((_zip, path) => path.endsWith(".json"))
            .keys()
            .compact()
            .value();
    }
}
