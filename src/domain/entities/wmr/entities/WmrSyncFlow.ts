import _ from "lodash";
import { DataSyncAggregation } from "../../../aggregated/entities/DataSyncAggregation";
import { DataSynchronizationParams } from "../../../aggregated/entities/DataSynchronizationParams";
import { DataValue } from "../../../aggregated/entities/DataValue";
import { buildPeriodFromParams, buildPeriodsForAggregation } from "../../../aggregated/utils";
import { DataSetPeriodType } from "./WmrSettings";

export const wmrSourcePeriodTypes = ["Yearly", "Monthly"] as const;
export type WmrSourcePeriodType = typeof wmrSourcePeriodTypes[number];

export type WmrSourceReading = Readonly<{
    enableAggregation: boolean;
    aggregationType: DataSyncAggregation | undefined;
    sumIntoYear: boolean;
}>;

const readingBySourcePeriodType: Readonly<Record<WmrSourcePeriodType, WmrSourceReading>> = {
    Yearly: { enableAggregation: false, aggregationType: undefined, sumIntoYear: false },
    Monthly: { enableAggregation: true, aggregationType: "MONTHLY", sumIntoYear: true },
};

export function isWmrSourcePeriodType(periodType: DataSetPeriodType): periodType is WmrSourcePeriodType {
    return wmrSourcePeriodTypes.some(sourcePeriodType => sourcePeriodType === periodType);
}

export function getWmrSourceReading(sourcePeriodType: WmrSourcePeriodType): WmrSourceReading {
    return readingBySourcePeriodType[sourcePeriodType];
}

export function getWmrReportedYear(params: DataSynchronizationParams): string {
    const { startDate, endDate } = buildPeriodFromParams(params);
    const years = buildPeriodsForAggregation("YEARLY", startDate, endDate);
    const [year] = years;
    if (years.length !== 1 || !year) {
        throw new Error(`WMR reports a single year, got the periods ${years.join(", ")}`);
    }
    return year;
}

export function getWmrSyncedYear(today: Date): number {
    return today.getFullYear() - 1;
}

export function sumIntoPeriod(dataValues: ReadonlyArray<DataValue>, period: string): DataValue[] {
    return _(dataValues)
        .groupBy(({ dataElement, orgUnit, categoryOptionCombo, attributeOptionCombo }) =>
            [dataElement, orgUnit, categoryOptionCombo, attributeOptionCombo].join("-")
        )
        .map(([first, ...rest]) => ({
            ...first,
            period,
            value: String([first, ...rest].reduce((total, { value }) => total + Number(value), 0)),
        }))
        .value();
}
