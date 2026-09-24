import { describe, expect, it } from "vitest";
import { buildMonthlyPeriodIds, getWmrAggregationSettings, getWmrSyncedYear } from "../WmrSyncFlow";

describe("WmrSyncFlow", () => {
    describe("getWmrAggregationSettings", () => {
        it("copies yearly destinations raw, without aggregation", () => {
            expect(getWmrAggregationSettings("Yearly")).toEqual({
                enableAggregation: false,
                aggregationType: undefined,
            });
        });

        it("aggregates monthly destinations into monthly buckets", () => {
            expect(getWmrAggregationSettings("Monthly")).toEqual({
                enableAggregation: true,
                aggregationType: "MONTHLY",
            });
        });

        it("rejects destinations with any other period type", () => {
            expect(() => getWmrAggregationSettings("Weekly")).toThrow(
                "WMR sync does not support destination data sets with period type Weekly"
            );
        });
    });

    describe("getWmrSyncedYear", () => {
        it("returns the year before the given date", () => {
            expect(getWmrSyncedYear(new Date(2026, 0, 1))).toBe(2025);
        });
    });

    describe("buildMonthlyPeriodIds", () => {
        it("lists the twelve monthly period ids of the year in order", () => {
            expect(buildMonthlyPeriodIds(2025)).toEqual([
                "202501",
                "202502",
                "202503",
                "202504",
                "202505",
                "202506",
                "202507",
                "202508",
                "202509",
                "202510",
                "202511",
                "202512",
            ]);
        });
    });
});
