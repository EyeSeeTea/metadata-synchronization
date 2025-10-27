import { SynchronizationRule, SynchronizationRuleData } from "../../domain/rules/entities/SynchronizationRule";
import { RulesRepository } from "../../domain/rules/repositories/RulesRepository";
import { StorageClient } from "../../domain/storage/repositories/StorageClient";
import { UserRepository } from "../../domain/user/repositories/UserRepository";
import { Namespace } from "../storage/Namespaces";
import { StorageClientFactory } from "../config/StorageClientFactory";
import { AggregatedDataExchange } from "./models/AggregatedDataExchange";
import { SyncRulePersistedData } from "./models/SyncRulePersistedData";
import { cleanOrgUnitPaths } from "../../domain/synchronization/utils";
import { Instance } from "../../domain/instance/entities/Instance";
import { D2Api } from "../../types/d2-api";
import { isDhisInstance } from "../../domain/instance/entities/DataSource";
import { getD2APiFromInstance } from "../../utils/d2-utils";
import { promiseMap } from "../../utils/common";

export class RulesD2ApiRepository implements RulesRepository {
    private api: D2Api;

    constructor(
        private instance: Instance,
        private storageClientFactory: StorageClientFactory,
        private userRepository: UserRepository
    ) {
        if (!isDhisInstance(this.instance)) {
            throw new Error("Invalid instance type for MetadataD2ApiRepository");
        }

        this.api = getD2APiFromInstance(this.instance);
    }

    public async getById(id: string): Promise<SynchronizationRule | undefined> {
        const storageClient = await this.getStorageClient();
        const data = await storageClient.getObjectInCollection<SynchronizationRuleData>(Namespace.RULES, id);

        if (data?.aggregatedDataExchangeId) {
            const ade = await this.getAggregatedDataExchange(data.aggregatedDataExchangeId);
            const dataWithADEX = {
                ...data,
                aggregatedDataExchangeTarget: Instance.build({
                    name: "Default",
                    url: ade.target.api.url,
                    authType: "http-basic",
                    username: ade.target.api.username,
                    password: ade.target.api.password,
                }),
            };
            return SynchronizationRule.build(dataWithADEX);
        } else {
            return data ? SynchronizationRule.build(data) : undefined;
        }
    }

    public async getSyncResults(id: string): Promise<SynchronizationRule[]> {
        const storageClient = await this.getStorageClient();
        const data = await storageClient.getObject<SynchronizationRule[]>(`${Namespace.RULES}-${id}`);

        return data ?? [];
    }

    public async list(allProperties?: boolean): Promise<SynchronizationRule[]> {
        const rulesData = await this.getRulesData(allProperties);
        return rulesData.map(ruleData => SynchronizationRule.build(ruleData));
    }

    private async getRulesData(allProperties?: boolean): Promise<SynchronizationRuleData[]> {
        const storageClient = await this.getStorageClient();

        if (allProperties) {
            return storageClient.getObjectsInCollection<SynchronizationRuleData>(Namespace.RULES);
        } else {
            return storageClient.listObjectsInCollection<SynchronizationRuleData>(Namespace.RULES);
        }
    }

    public async save(rules: SynchronizationRule[]): Promise<void> {
        const user = await this.userRepository.getCurrent();

        //TODO: This business rule logic should be realized in the entity
        const data: SynchronizationRuleData[] = rules.map(rule => {
            return {
                ...rule
                    .update({
                        lastUpdated: new Date(),
                        lastUpdatedBy: { id: user.id, name: user.name },
                    })
                    .toObject(),
            };
        });

        const aggregateDataExchanges = await this.createAggregateDataExchange(data);

        await promiseMap(aggregateDataExchanges, async ade => {
            await this.saveAggregatedDataExchange(ade);
        });

        data.forEach(rule => {
            delete rule.aggregatedDataExchangeTarget;
        });

        const storageClient = await this.getStorageClient();
        await storageClient.saveObjectsInCollection<SyncRulePersistedData>(Namespace.RULES, data);
    }

    public async delete(id: string): Promise<void> {
        const storageClient = await this.getStorageClient();
        await storageClient.removeObjectInCollection(Namespace.RULES, id);

        const runcRule = await this.getById(id);
        if (!runcRule || !runcRule.aggregatedDataExchangeId) {
            return;
        }

        await this.deleteAggregatedDataExchange(runcRule.aggregatedDataExchangeId);
    }

    private getStorageClient(): Promise<StorageClient> {
        return this.storageClientFactory.getStorageClientPromise();
    }

    private async createAggregateDataExchange(rulesData: SynchronizationRuleData[]) {
        const aggregatedDataExchangeRules = rulesData.filter(
            ruleData => ruleData.useAggregatedDataExchange && ruleData.aggregatedDataExchangeTarget
        );

        const aggregateDataExchange: AggregatedDataExchange[] = await promiseMap(
            aggregatedDataExchangeRules,
            async ruleData => {
                const orgUnits = cleanOrgUnitPaths(ruleData.builder.dataParams?.orgUnitPaths || []);
                const metadataIds = ruleData.builder.metadataIds || [];

                const orgUnitCodes = await this.getMetadataCodesByIds(orgUnits);
                const metadataCodes = await this.getMetadataCodesByIds(metadataIds);

                return {
                    id: ruleData.aggregatedDataExchangeId || "",
                    name: ruleData.name,
                    source: {
                        params: { periodTypes: [ruleData.builder.dataParams?.aggregationType || "MONTHLY"] },
                        requests: [
                            {
                                name: ruleData.name,
                                dx: metadataCodes,
                                pe: [ruleData.builder.dataParams?.period || "LAST_12_MONTHS"],
                                ou: orgUnitCodes,
                                inputIdScheme: "CODE",
                                outputIdScheme: "CODE",
                            },
                        ],
                    },
                    target: {
                        type: "EXTERNAL",
                        api: {
                            url: ruleData.aggregatedDataExchangeTarget!.url || "",
                            username: ruleData.aggregatedDataExchangeTarget!.username || "",
                            password: ruleData.aggregatedDataExchangeTarget!.password || "",
                        },
                        request: {
                            idScheme: "CODE",
                        },
                    },
                };
            }
        );

        return aggregateDataExchange;
    }

    private async getMetadataCodesByIds(metadataIds: string[]): Promise<string[]> {
        const params = {
            fields: {
                id: true,
                code: true,
            },
            filter: {
                id: { in: metadataIds },
            },
        };

        const response = await this.api.metadata
            .get({
                organisationUnits: params,
                programIndicators: params,
                indicators: params,
                dataElements: params,
            })
            .getData();

        const allMetadata = Object.values(response).flat();

        return allMetadata.map(item => item.code);
    }

    private async getAggregatedDataExchange(aggregatedDataExchangeId: string): Promise<AggregatedDataExchange> {
        return this.api.get<AggregatedDataExchange>(`aggregateDataExchanges/${aggregatedDataExchangeId}`, {}).getData();
    }

    private async saveAggregatedDataExchange(aggregateDataExchange: AggregatedDataExchange) {
        const existedAggregatedDataExchange = await this.getAggregatedDataExchange(aggregateDataExchange.id);

        if (existedAggregatedDataExchange) {
            await this.api
                .put(`/aggregateDataExchanges/${existedAggregatedDataExchange.id}`, {}, aggregateDataExchange)
                .getData();
        } else {
            await this.api.post("/aggregateDataExchanges", {}, aggregateDataExchange).getData();
        }
    }

    private async deleteAggregatedDataExchange(aggregatedDataExchangeId: string) {
        return this.api.delete(`aggregateDataExchanges/${aggregatedDataExchangeId}`, {}).getData();
    }
}
