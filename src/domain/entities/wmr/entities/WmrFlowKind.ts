import { Id } from "../../../common/entities/Schemas";
import { DataSyncAggregation } from "../../../aggregated/entities/DataSyncAggregation";
import { Maybe } from "../../../../types/utils";
import { WmrNamedOrgUnit } from "./WmrOrgUnits";
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
        requisites: ["metadata", "countryFormMonthly"],
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

export function getWmrDestinationOrgUnits(
    definition: WmrFlowDefinition,
    country: WmrNamedOrgUnit,
    parents: ReadonlyArray<WmrNamedOrgUnit>
): ReadonlyArray<WmrNamedOrgUnit> {
    switch (definition.destinationOrgUnits) {
        case "country":
            return [country];
        case "parents":
            return parents;
    }
}

export type WmrSubmitTarget = Readonly<
    { type: "ready"; orgUnitPaths: ReadonlyArray<string>; orgUnitIdOverride: Maybe<Id> } | { type: "missingOrgUnit" }
>;

export function getWmrSubmitTarget(
    definition: WmrFlowDefinition,
    country: WmrNamedOrgUnit,
    parents: ReadonlyArray<WmrNamedOrgUnit>,
    targetOrgUnitId: Maybe<Id>
): WmrSubmitTarget {
    const orgUnitPaths = getWmrDestinationOrgUnits(definition, country, parents).map(({ path }) => path);
    switch (definition.targetOrgUnit) {
        case "override":
            return targetOrgUnitId
                ? { type: "ready", orgUnitPaths, orgUnitIdOverride: targetOrgUnitId }
                : { type: "missingOrgUnit" };
        case "mapping":
            return { type: "ready", orgUnitPaths, orgUnitIdOverride: undefined };
    }
}
