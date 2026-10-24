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

export type WmrMonthRange = Readonly<{ from: string; to: string }>;

const monthsPerYear = 12;

export function getWmrYearMonths(year: string): ReadonlyArray<string> {
    return Array.from({ length: monthsPerYear }, (_, index) => `${year}${String(index + 1).padStart(2, "0")}`);
}

export function getWmrFullYearRange(year: string): WmrMonthRange {
    return { from: `${year}01`, to: `${year}12` };
}

export function isWmrFullYearRange(range: WmrMonthRange, year: string): boolean {
    return _.isEqual(range, getWmrFullYearRange(year));
}

export function getWmrRangeEndMonths(months: ReadonlyArray<string>, range: WmrMonthRange): ReadonlyArray<string> {
    return months.filter(month => month >= range.from);
}

export function updateWmrRangeStart(range: WmrMonthRange, from: string): WmrMonthRange {
    return { from, to: from > range.to ? from : range.to };
}

export function getWmrMonthStart(month: string): Date {
    return new Date(Number(month.slice(0, 4)), Number(month.slice(4, 6)) - 1, 1);
}

function getWmrMonthEnd(month: string): Date {
    return new Date(Number(month.slice(0, 4)), Number(month.slice(4, 6)), 0);
}

export function getWmrMonthRangeDates({ from, to }: WmrMonthRange): Readonly<{ startDate: Date; endDate: Date }> {
    return { startDate: getWmrMonthStart(from), endDate: getWmrMonthEnd(to) };
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
