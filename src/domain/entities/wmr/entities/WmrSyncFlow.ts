import _ from "lodash";
import { DataSyncAggregation } from "../../../aggregated/entities/DataSyncAggregation";
import { DataSetPeriodType } from "./WmrSettings";

export type WmrAggregationSettings = Readonly<{
    enableAggregation: boolean;
    aggregationType: DataSyncAggregation | undefined;
}>;

const aggregationByDestinationPeriodType: Readonly<Partial<Record<DataSetPeriodType, WmrAggregationSettings>>> = {
    Yearly: { enableAggregation: false, aggregationType: undefined },
    Monthly: { enableAggregation: true, aggregationType: "MONTHLY" },
};

export function getWmrAggregationSettings(destinationPeriodType: DataSetPeriodType): WmrAggregationSettings {
    const settings = aggregationByDestinationPeriodType[destinationPeriodType];
    if (!settings) {
        throw new Error(`WMR sync does not support destination data sets with period type ${destinationPeriodType}`);
    }
    return settings;
}

export function getWmrSyncedYear(today: Date): number {
    return today.getFullYear() - 1;
}

export function buildMonthlyPeriodIds(year: number): ReadonlyArray<string> {
    return _.range(1, 13).map(month => `${year}${month.toString().padStart(2, "0")}`);
}
