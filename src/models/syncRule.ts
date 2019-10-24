import _ from "lodash";
import moment from "moment";
import cronstrue from "cronstrue";
import { generateUid } from "d2/uid";

import { deleteData, getDataById, getPaginatedData, saveData } from "./dataStore";
import isValidCronExpression from "../utils/validCronExpression";
import { getUserInfo, isGlobalAdmin, UserInfo } from "../utils/permissions";
import { D2 } from "../types/d2";
import { SyncRuleTableFilters, TableList, TablePagination } from "../types/d2-ui-components";
import {
    SynchronizationRule,
    SharingSetting,
    SynchronizationParams,
    SyncRuleType,
} from "../types/synchronization";
import { Validation } from "../types/validations";

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
                "publicAccess",
                "userAccesses",
                "userGroupAccesses",
                "type"
            ]),
        };
    }

    public get name(): string {
        return this.syncRule.name;
    }

    public get type(): SyncRuleType {
        return this.syncRule.type;
    }

    public get description(): string | undefined {
        return this.syncRule.description;
    }

    public get metadataIds(): string[] {
        return this.syncRule.builder.metadataIds;
    }

    public get organisationUnits(): string[] {
        return this.syncRule.builder.dataParams ? this.syncRule.builder.dataParams.organisationUnits:[];
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

    public get publicAccess(): string {
        return this.syncRule.publicAccess;
    }

    public get userAccesses(): SharingSetting[] {
        return this.syncRule.userAccesses;
    }

    public get userGroupAccesses(): SharingSetting[] {
        return this.syncRule.userGroupAccesses;
    }

    public get syncParams(): SynchronizationParams {
        return this.syncRule.builder.syncParams || {};
    }

    public static create(type: SyncRuleType = "metadata"): SyncRule {
        return new SyncRule({
            id: "",
            name: "",
            description: "",
            type: type,
            builder: {
                targetInstances: [],
                metadataIds: [],
                dataParams: undefined,
                syncParams: {
                    includeSharingSettings: true,
                    atomicMode: "ALL",
                    mergeMode: "MERGE",
                },
            },
            enabled: false,
            publicAccess: "rw------",
            userAccesses: [],
            userGroupAccesses: [],
        });
    }

    public static createOnDemand(type: SyncRuleType = "metadata"): SyncRule {
        return SyncRule.create(type).updateName("On-demand");
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
        const { page = 1, pageSize = 20, paging = true } = pagination || {};

        const globalAdmin = await isGlobalAdmin(d2);
        const userInfo = await getUserInfo(d2);

        const data = await getPaginatedData(d2, dataStoreKey, filters, pagination);
        const objects = _(data.objects)
            .filter(data => {
                const rule = SyncRule.build(data);
                return globalAdmin || rule.isVisibleToUser(userInfo);
            })
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

        const total = objects.length;
        const pageCount = paging ? Math.ceil(objects.length / pageSize) : 1;

        return { objects, pager: { page, pageCount, total } };
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
        return SyncRule.build({
            ...this.syncRule,
            builder: {
                ...this.syncRule.builder,
                metadataIds,
            },
        });
    }

    public updateOrganisationUnits(organisationUnits: string[]): SyncRule {
        return SyncRule.build({
            ...this.syncRule,
            builder: {
                ...this.syncRule.builder,
                dataParams: {
                    ...this.syncRule.builder.dataParams,
                    organisationUnits
                }
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

    public updateSyncParams(syncParams: SynchronizationParams): SyncRule {
        return SyncRule.build({
            ...this.syncRule,
            builder: {
                ...this.syncRule.builder,
                syncParams,
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

    public isVisibleToUser(userInfo: UserInfo, permission: "READ" | "WRITE" = "READ") {
        const { id: userId, userGroups } = userInfo;
        const token = permission === "READ" ? "r" : "w";
        const {
            publicAccess = "--------",
            userAccesses = [],
            userGroupAccesses = [],
        } = this.syncRule;

        return (
            publicAccess.substring(0, 2).includes(token) ||
            !!_(userAccesses)
                .filter(({ access }) => access.substring(0, 2).includes(token))
                .find(({ id }) => id === userId) ||
            _(userGroupAccesses)
                .filter(({ access }) => access.substring(0, 2).includes(token))
                .intersectionBy(userGroups, "id")
                .value().length > 0
        );
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
                this.type === "metadata" && this.metadataIds.length === 0
                    ? {
                        key: "cannot_be_empty",
                        namespace: { element: "metadata element" },
                    }
                    : null,
            ]),
            organisationUnits: _.compact([
                this.type === "data" && this.organisationUnits.length === 0
                    ? {
                        key: "cannot_be_empty",
                        namespace: { element: "organisation unit" },
                    }
                    : null,
            ]),
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

    public async isValid(): Promise<boolean> {
        const validation = await this.validate();
        return _.flatten(Object.values(validation)).length === 0;
    }
}
