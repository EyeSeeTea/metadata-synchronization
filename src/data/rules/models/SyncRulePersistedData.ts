import { SynchronizationRuleData } from "../../../domain/rules/entities/SynchronizationRule";

export type SyncRulePersistedData = Omit<
    SynchronizationRuleData,
    "aggregatedDataExchanges" 
> & {
    aggregatedDataExchanges?: { id: string }[];
};
