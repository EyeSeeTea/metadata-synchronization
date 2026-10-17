import { Id } from "../../../common/entities/Schemas";
import { DataSyncAggregation } from "../../../aggregated/entities/DataSyncAggregation";
import { WmrRequisiteType } from "./WmrRequisite";
import { WmrSourcePeriodType } from "./WmrSyncFlow";

export const wmrFlowKinds = ["global", "regional"] as const;
export type WmrFlowKind = typeof wmrFlowKinds[number];

export type WmrFlowDefinition = Readonly<{
    sourcePeriodType: WmrSourcePeriodType;
    requisites: ReadonlyArray<WmrRequisiteType>;
    destinationOrgUnits: "country" | "parents";
    targetOrgUnit: "override" | "mapping";
    aggregation: "always" | "withIndicators";
    aggregationType: DataSyncAggregation;
    sumIntoYear: boolean;
}>;

export const wmrFlowDefinitions: Readonly<Record<WmrFlowKind, WmrFlowDefinition>> = {
    global: {
        sourcePeriodType: "Yearly",
        requisites: ["metadata", "dataStore"],
        destinationOrgUnits: "country",
        targetOrgUnit: "override",
        aggregation: "withIndicators",
        aggregationType: "YEARLY",
        sumIntoYear: false,
    },
    regional: {
        sourcePeriodType: "Monthly",
        requisites: ["metadata", "dataStore", "countryFormMonthly"],
        destinationOrgUnits: "parents",
        targetOrgUnit: "mapping",
        aggregation: "always",
        aggregationType: "MONTHLY",
        sumIntoYear: true,
    },
};

export function isWmrAggregationEnabled(definition: WmrFlowDefinition, mappedIndicatorIds: ReadonlyArray<Id>): boolean {
    switch (definition.aggregation) {
        case "always":
            return true;
        case "withIndicators":
            return mappedIndicatorIds.length > 0;
    }
}
