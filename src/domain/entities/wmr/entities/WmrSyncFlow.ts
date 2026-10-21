import _ from "lodash";
import { DataSynchronizationParams } from "../../../aggregated/entities/DataSynchronizationParams";
import { DataValue } from "../../../aggregated/entities/DataValue";
import { buildPeriodFromParams, buildPeriodsForAggregation } from "../../../aggregated/utils";

export const wmrSourcePeriodTypes = ["Yearly", "Monthly"] as const;
export type WmrSourcePeriodType = typeof wmrSourcePeriodTypes[number];

export function getWmrReportedYear(params: DataSynchronizationParams): string {
    const { startDate, endDate } = buildPeriodFromParams(params);
    const years = buildPeriodsForAggregation("YEARLY", startDate, endDate);
    const [year] = years;
    if (years.length !== 1 || !year) {
        throw new Error(`WMR reports a single year, got the periods ${years.join(", ")}`);
    }
    return year;
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
