import { describe, expect, it } from "vitest";
import { DataValue } from "../../../../aggregated/entities/DataValue";
import {
    getWmrReportedYear,
    getWmrSourceReading,
    getWmrSyncedYear,
    isWmrSourcePeriodType,
    sumIntoPeriod,
} from "../WmrSyncFlow";

const deaths = "bjyXcVn0Slk";
const cases = "Th6srmdoaxC";
const country = "ImspTQPwCqd";
const publicCombo = "R5qZMtfmdF0";
const privateCombo = "UeyDzq4Gdsr";
const defaultCombo = "HllvX50cXC0";

function dataValue(dataElement: string, period: string, categoryOptionCombo: string, value: string): DataValue {
    return {
        dataElement,
        period,
        orgUnit: country,
        categoryOptionCombo,
        attributeOptionCombo: defaultCombo,
        value,
        comment: "[aggregated]",
    };
}

describe("WmrSyncFlow", () => {
    describe("getWmrSourceReading", () => {
        it("copies yearly sources raw, without aggregation", () => {
            expect(getWmrSourceReading("Yearly")).toEqual({
                enableAggregation: false,
                aggregationType: undefined,
                sumIntoYear: false,
            });
        });

        it("reads monthly sources from monthly analytics and sums them into the year", () => {
            expect(getWmrSourceReading("Monthly")).toEqual({
                enableAggregation: true,
                aggregationType: "MONTHLY",
                sumIntoYear: true,
            });
        });
    });

    describe("isWmrSourcePeriodType", () => {
        it("accepts only yearly and monthly sources", () => {
            expect((["Yearly", "Monthly", "Weekly"] as const).map(isWmrSourcePeriodType)).toEqual([true, true, false]);
        });
    });

    describe("getWmrReportedYear", () => {
        it("returns the year covered by the sync period", () => {
            const params = {
                period: "FIXED" as const,
                startDate: new Date(2025, 0, 1),
                endDate: new Date(2025, 11, 31),
            };

            expect(getWmrReportedYear(params)).toBe("2025");
        });

        it("rejects a sync period that spans several years", () => {
            const params = {
                period: "FIXED" as const,
                startDate: new Date(2024, 0, 1),
                endDate: new Date(2025, 11, 31),
            };

            expect(() => getWmrReportedYear(params)).toThrow("WMR reports a single year, got the periods 2024, 2025");
        });
    });

    describe("getWmrSyncedYear", () => {
        it("returns the year before the given date", () => {
            expect(getWmrSyncedYear(new Date(2026, 0, 1))).toBe(2025);
        });
    });

    describe("sumIntoPeriod", () => {
        it("sums the months of the same data element and combo into the year", () => {
            const months = [
                dataValue(deaths, "202505", defaultCombo, "7"),
                dataValue(deaths, "202512", defaultCombo, "1"),
            ];

            expect(sumIntoPeriod(months, "2025")).toEqual([dataValue(deaths, "2025", defaultCombo, "8")]);
        });

        it("keeps data elements and category option combos apart", () => {
            const months = [
                dataValue(cases, "202505", publicCombo, "100"),
                dataValue(cases, "202512", publicCombo, "5"),
                dataValue(cases, "202505", privateCombo, "200"),
                dataValue(deaths, "202505", defaultCombo, "7"),
            ];

            expect(sumIntoPeriod(months, "2025")).toEqual([
                dataValue(cases, "2025", publicCombo, "105"),
                dataValue(cases, "2025", privateCombo, "200"),
                dataValue(deaths, "2025", defaultCombo, "7"),
            ]);
        });

        it("moves a single month to the year unchanged", () => {
            expect(sumIntoPeriod([dataValue(deaths, "202512", defaultCombo, "1")], "2025")).toEqual([
                dataValue(deaths, "2025", defaultCombo, "1"),
            ]);
        });
    });
});
