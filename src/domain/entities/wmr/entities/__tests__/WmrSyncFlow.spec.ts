import moment from "moment";
import { describe, expect, it } from "vitest";
import { buildPeriodFromParams, buildPeriodsForAggregation } from "../../../../aggregated/utils";
import {
    getWmrFullYearRange,
    getWmrMonthRangeDates,
    getWmrRangeMonths,
    getWmrRangeEndMonths,
    getWmrReportedYear,
    getWmrYearMonths,
    isWmrFullYearRange,
    updateWmrRangeStart,
    WmrMonthRange,
} from "../WmrSyncFlow";

const marchToJune: WmrMonthRange = { from: "202503", to: "202506" };

function formatDay(date: Date): string {
    return moment(date).format("YYYY-MM-DD");
}

function fixedParams(range: WmrMonthRange) {
    return { period: "FIXED" as const, ...getWmrMonthRangeDates(range) };
}

describe("WmrSyncFlow", () => {
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

    describe("getWmrYearMonths", () => {
        it("lists the twelve monthly periods of the year", () => {
            expect(getWmrYearMonths("2025")).toEqual([
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

    describe("getWmrFullYearRange", () => {
        it("goes from January to December", () => {
            expect(getWmrFullYearRange("2025")).toEqual({ from: "202501", to: "202512" });
        });
    });

    describe("isWmrFullYearRange", () => {
        it("accepts January to December of the year", () => {
            expect(isWmrFullYearRange({ from: "202501", to: "202512" }, "2025")).toBe(true);
        });

        it("rejects a range that leaves months out", () => {
            expect(isWmrFullYearRange(marchToJune, "2025")).toBe(false);
        });

        it("rejects the full range of another year", () => {
            expect(isWmrFullYearRange({ from: "202401", to: "202412" }, "2025")).toBe(false);
        });
    });

    describe("getWmrRangeEndMonths", () => {
        it("offers only the months from the start of the range", () => {
            expect(getWmrRangeEndMonths(getWmrYearMonths("2025"), { from: "202509", to: "202512" })).toEqual([
                "202509",
                "202510",
                "202511",
                "202512",
            ]);
        });
    });

    describe("getWmrRangeMonths", () => {
        it("returns every selected monthly period, inclusive", () => {
            expect(getWmrRangeMonths(marchToJune)).toEqual(["202503", "202504", "202505", "202506"]);
        });

        it("keeps a single selected month", () => {
            expect(getWmrRangeMonths({ from: "202512", to: "202512" })).toEqual(["202512"]);
        });

        it("rejects invalid or cross-year ranges", () => {
            expect(() => getWmrRangeMonths({ from: "202513", to: "202514" })).toThrow("YYYYMM");
            expect(() => getWmrRangeMonths({ from: "202512", to: "202601" })).toThrow("one reporting year");
            expect(() => getWmrRangeMonths({ from: "202506", to: "202503" })).toThrow("ordered");
        });
    });

    describe("updateWmrRangeStart", () => {
        it("keeps the end when the new start is before it", () => {
            expect(updateWmrRangeStart(marchToJune, "202505")).toEqual({ from: "202505", to: "202506" });
        });

        it("moves the end to the new start when the start goes past it", () => {
            expect(updateWmrRangeStart(marchToJune, "202509")).toEqual({ from: "202509", to: "202509" });
        });
    });

    describe("getWmrMonthRangeDates", () => {
        it("starts on the first day of the first month and ends on the last day of the last month", () => {
            const { startDate, endDate } = getWmrMonthRangeDates(marchToJune);

            expect([formatDay(startDate), formatDay(endDate)]).toEqual(["2025-03-01", "2025-06-30"]);
        });

        it("ends February on the 28th in a common year", () => {
            const { endDate } = getWmrMonthRangeDates({ from: "202502", to: "202502" });

            expect(formatDay(endDate)).toBe("2025-02-28");
        });

        it("ends December on the 31st", () => {
            const { endDate } = getWmrMonthRangeDates(getWmrFullYearRange("2025"));

            expect(formatDay(endDate)).toBe("2025-12-31");
        });

        it("gives the core exactly the selected months for a monthly aggregation", () => {
            const { startDate, endDate } = buildPeriodFromParams(fixedParams(marchToJune));

            expect(buildPeriodsForAggregation("MONTHLY", startDate, endDate)).toEqual([
                "202503",
                "202504",
                "202505",
                "202506",
            ]);
        });

        it("gives the core a single month when the range has one month", () => {
            const { startDate, endDate } = buildPeriodFromParams(fixedParams({ from: "202512", to: "202512" }));

            expect(buildPeriodsForAggregation("MONTHLY", startDate, endDate)).toEqual(["202512"]);
        });

        it("keeps the reported year of a fixed rule with the dates of the range", () => {
            expect(getWmrReportedYear(fixedParams(marchToJune))).toBe("2025");
        });
    });
});
