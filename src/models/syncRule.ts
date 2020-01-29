import _ from "lodash";
import moment from "moment";
import cronstrue from "cronstrue";
import { generateUid } from "d2/uid";

import { deleteData, getDataById, getPaginatedData, saveData } from "./dataStore";
import isValidCronExpression from "../utils/validCronExpression";
import { D2 } from "../types/d2";
import { SyncRuleTableFilters, TableList, TablePagination } from "../types/d2-ui-components";
import {
    SynchronizationRule,
    MetadataIncludeExcludeRules,
    ExcludeIncludeRules,
} from "../types/synchronization";
import { Validation } from "../types/validations";
import { D2Model } from "./d2Model";
import { extractParentsFromRule, extractChildrenFromRules } from "../utils/metadataIncludeExclude";

const dataStoreKey = "rules";

export default class SyncRule {
    private readonly syncRule: SynchronizationRule;

    constructor(syncRule: SynchronizationRule) {
        this.syncRule = {
            id: generateUid(),
            ..._.pick(syncRule, [
                "id",
                "name",
                "description",
                "builder",
                "enabled",
                "frequency",
                "lastExecuted",
            ]),
        };
    }

    public get name(): string {
        return this.syncRule.name;
    }

    public get description(): string | undefined {
        return this.syncRule.description;
    }

    public get metadataIds(): string[] {
        return this.syncRule.builder.metadataIds;
    }

    public get useDefaultIncludeExclude(): boolean {
        return this.syncRule.builder.useDefaultIncludeExclude !== undefined
            ? this.syncRule.builder.useDefaultIncludeExclude
            : true;
    }

    public get metadataExcludeIncludeRules(): MetadataIncludeExcludeRules {
        return this.syncRule.builder.metadataIncludeExcludeRules !== undefined
            ? this.syncRule.builder.metadataIncludeExcludeRules
            : {};
    }

    public get targetInstances(): string[] {
        return this.syncRule.builder.targetInstances;
    }

    public get enabled(): boolean {
        return this.syncRule.enabled;
    }

    public get frequency(): string | undefined {
        return this.syncRule.frequency;
    }

    public get lastExecuted(): Date | undefined {
        return this.syncRule.lastExecuted ? new Date(this.syncRule.lastExecuted) : undefined;
    }

    public get readableFrequency(): string | undefined {
        const { frequency } = this.syncRule;
        return frequency && isValidCronExpression(frequency)
            ? cronstrue.toString(frequency)
            : undefined;
    }

    public get longFrequency(): string | undefined {
        const { frequency } = this.syncRule;
        return frequency && isValidCronExpression(frequency)
            ? `${cronstrue.toString(frequency)} (${frequency})`
            : undefined;
    }

    public static create(): SyncRule {
        return new SyncRule({
            id: "",
            name: "",
            description: "",
            builder: {
                metadataIncludeExcludeRules: {},
                useDefaultIncludeExclude: true,
                targetInstances: [],
                metadataIds: [],
            },
            enabled: false,
        });
    }

    public static build(syncRule: SynchronizationRule | undefined): SyncRule {
        return syncRule ? new SyncRule(syncRule) : this.create();
    }

    public static async get(d2: D2, id: string): Promise<SyncRule> {
        const data = await getDataById(d2, dataStoreKey, id);
        return this.build(data);
    }

    public static async list(
        d2: D2,
        filters: SyncRuleTableFilters,
        pagination: TablePagination
    ): Promise<TableList> {
        const { targetInstanceFilter = null, enabledFilter = null, lastExecutedFilter = null } =
            filters || {};
        const data = await getPaginatedData(d2, dataStoreKey, filters, pagination);
        const objects = _(data.objects)
            .filter(rule =>
                targetInstanceFilter
                    ? rule.builder.targetInstances.includes(targetInstanceFilter)
                    : true
            )
            .filter(rule => (enabledFilter ? rule.enabled && enabledFilter === "enabled" : true))
            .filter(rule =>
                lastExecutedFilter && rule.lastExecuted
                    ? moment(lastExecutedFilter).isSameOrBefore(rule.lastExecuted)
                    : true
            )
            .value();
        return { ...data, objects };
    }

    public updateName(name: string): SyncRule {
        return SyncRule.build({
            ...this.syncRule,
            name,
        });
    }

    public updateDescription(description: string): SyncRule {
        return SyncRule.build({
            ...this.syncRule,
            description,
        });
    }

    public updateMetadataIds(metadataIds: string[]): SyncRule {
        if (_.isEqual(this.metadataIds, metadataIds)) {
            return SyncRule.build({
                ...this.syncRule,
                builder: {
                    ...this.syncRule.builder,
                    metadataIds,
                },
            });
        } else {
            // When metadataIds really has changed we should reset
            // useDefaultIncludeExclude and metadataIncludeExcludeRules
            return SyncRule.build({
                ...this.syncRule,
                builder: {
                    ...this.syncRule.builder,
                    metadataIds,
                    useDefaultIncludeExclude: true,
                    metadataIncludeExcludeRules: {},
                },
            });
        }
    }

    public markToUseDefaultIncludeExclude(): SyncRule {
        return SyncRule.build({
            ...this.syncRule,
            builder: {
                ...this.syncRule.builder,
                useDefaultIncludeExclude: true,
                metadataIncludeExcludeRules: {},
            },
        });
    }

    public markToNotUseDefaultIncludeExclude(models: Array<typeof D2Model>): SyncRule {
        const metadataIncludeExcludeRules: MetadataIncludeExcludeRules = models.reduce(
            (accumulator: any, model: typeof D2Model) => ({
                ...accumulator,
                [model.getMetadataType()]: {
                    includeRules: model.getIncludeRules().map(array => array.join(".")),
                    excludeRules: model.getExcludeRules().map(array => array.join(".")),
                },
            }),
            {}
        );

        return SyncRule.build({
            ...this.syncRule,
            builder: {
                ...this.syncRule.builder,
                useDefaultIncludeExclude: false,
                metadataIncludeExcludeRules,
            },
        });
    }

    public moveRuleFromExcludeToInclude(type: string, ruleIndexes: number[]): SyncRule {
        return this.moveIncludeExcludeRules(type, ruleIndexes, true);
    }

    public moveRuleFromIncludeToExclude(type: string, ruleIndexes: number[]): SyncRule {
        return this.moveIncludeExcludeRules(type, ruleIndexes, false);
    }

    private moveIncludeExcludeRules(
        type: string,
        ruleIndexes: number[],
        include: boolean
    ): SyncRule {
        if (!this.metadataExcludeIncludeRules) {
            throw Error("metadataExcludeIncludeRules is not defined");
        }

        const oldIncludeRules = this.metadataExcludeIncludeRules[type].includeRules;
        const oldExcludeRules = this.metadataExcludeIncludeRules[type].excludeRules;

        if (include) {
            const rulesToInclude = oldExcludeRules.filter((_, index) =>
                ruleIndexes.includes(index)
            );

            const rulesToIncludeWithParents = _.uniq(
                rulesToInclude.reduce(
                    (array: string[], rule: string) => [
                        ...array,
                        rule,
                        ...extractParentsFromRule(rule),
                    ],
                    []
                )
            );

            const excludeIncludeRules = {
                includeRules: _.uniq([...oldIncludeRules, ...rulesToIncludeWithParents]),
                excludeRules: oldExcludeRules.filter(
                    rule => !rulesToIncludeWithParents.includes(rule)
                ),
            };

            return this.updateIncludeExcludeRules(type, excludeIncludeRules);
        } else {
            const rulesToExclude = oldIncludeRules.filter((_, index) =>
                ruleIndexes.includes(index)
            );

            const rulesToExcludeWithChildren = _.uniq(
                rulesToExclude.reduce(
                    (array: string[], rule: string) => [
                        ...array,
                        rule,
                        ...extractChildrenFromRules(rule, oldIncludeRules),
                    ],
                    []
                )
            );

            const excludeIncludeRules = {
                includeRules: oldIncludeRules.filter(
                    rule => !rulesToExcludeWithChildren.includes(rule)
                ),
                excludeRules: [...oldExcludeRules, ...rulesToExcludeWithChildren],
            };

            return this.updateIncludeExcludeRules(type, excludeIncludeRules);
        }
    }

    private updateIncludeExcludeRules(
        type: string,
        excludeIncludeRules: ExcludeIncludeRules
    ): SyncRule {
        const metadataIncludeExcludeRules = {
            ...this.metadataExcludeIncludeRules,
            [type]: excludeIncludeRules,
        };

        return SyncRule.build({
            ...this.syncRule,
            builder: {
                ...this.syncRule.builder,
                metadataIncludeExcludeRules,
            },
        });
    }

    public updateTargetInstances(targetInstances: string[]): SyncRule {
        return SyncRule.build({
            ...this.syncRule,
            builder: {
                ...this.syncRule.builder,
                targetInstances,
            },
        });
    }

    public updateEnabled(enabled: boolean): SyncRule {
        return SyncRule.build({
            ...this.syncRule,
            enabled,
        });
    }

    public updateFrequency(frequency: string): SyncRule {
        return SyncRule.build({
            ...this.syncRule,
            frequency,
        });
    }

    public updateLastExecuted(lastExecuted: Date): SyncRule {
        return SyncRule.build({
            ...this.syncRule,
            lastExecuted,
        });
    }

    public async save(d2: D2): Promise<void> {
        const exists = !!this.syncRule.id;
        const element = exists ? this.syncRule : { ...this.syncRule, id: generateUid() };

        if (exists) await this.remove(d2);
        await saveData(d2, dataStoreKey, element);
    }

    public async remove(d2: D2): Promise<void> {
        await deleteData(d2, dataStoreKey, this.syncRule);
    }

    public async validate(): Promise<Validation> {
        return _.pickBy({
            name: _.compact([
                !this.name.trim()
                    ? {
                          key: "cannot_be_blank",
                          namespace: { field: "name" },
                      }
                    : null,
            ]),
            metadataIds: _.compact([
                this.metadataIds.length === 0
                    ? {
                          key: "cannot_be_empty",
                          namespace: { element: "metadata element" },
                      }
                    : null,
            ]),
            metadataIncludeExclude: [],
            targetInstances: _.compact([
                this.targetInstances.length === 0
                    ? {
                          key: "cannot_be_empty",
                          namespace: { element: "instance" },
                      }
                    : null,
            ]),
            frequency: _.compact([
                this.frequency && !isValidCronExpression(this.frequency)
                    ? {
                          key: "cron_expression_must_be_valid",
                          namespace: { expression: "frequency" },
                      }
                    : null,
            ]),
            enabled: _.compact([
                this.enabled && !isValidCronExpression(this.frequency)
                    ? {
                          key: "cannot_enable_without_valid",
                          namespace: { expression: "frequency" },
                      }
                    : null,
            ]),
        });
    }
}
