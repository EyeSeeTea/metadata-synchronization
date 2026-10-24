import { describe, expect, it, vi } from "vitest";
import { getWmrFullYearRange, getWmrYearMonths } from "../../../../../domain/entities/wmr/entities/WmrSyncFlow";
import { describeWmrSyncPeriod, formatWmrMonthName } from "../WmrSyncPeriod";

vi.hoisted(() => {
    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: { getItem: () => null },
    });
});

const year = "2025";
const marchToJune = { from: "202503", to: "202506" };
const onlyMarch = { from: "202503", to: "202503" };

describe("describeWmrSyncPeriod", () => {
    describe("without a month range", () => {
        it("shows the year of a yearly sync", () => {
            expect(describeWmrSyncPeriod(year, undefined, "en-US")).toBe("Period: 2025");
        });

        it("shows the same text in every locale", () => {
            expect(describeWmrSyncPeriod(year, undefined, "es")).toBe("Period: 2025");
        });
    });

    describe("with a range of several months", () => {
        it("shows the full year summed with the given locale", () => {
            expect(describeWmrSyncPeriod(year, getWmrFullYearRange(year), "en-US")).toBe(
                "Period: 2025, sum of January 2025 to December 2025"
            );
        });

        it("shows the months of the range", () => {
            expect(describeWmrSyncPeriod(year, marchToJune, "en-US")).toBe(
                "Period: 2025, sum of March 2025 to June 2025"
            );
        });

        it("names the months in the language of the locale", () => {
            expect(describeWmrSyncPeriod(year, marchToJune, "es")).toBe(
                "Period: 2025, sum of marzo de 2025 to junio de 2025"
            );
        });
    });

    describe("with a single month", () => {
        it("shows the only month synced", () => {
            expect(describeWmrSyncPeriod(year, onlyMarch, "en-US")).toBe("Period: 2025, March 2025 only");
        });

        it("names the month in the language of the locale", () => {
            expect(describeWmrSyncPeriod(year, onlyMarch, "es")).toBe("Period: 2025, marzo de 2025 only");
        });
    });
});

describe("formatWmrMonthName", () => {
    it("names every month of the year without the year", () => {
        expect(getWmrYearMonths(year).map(month => formatWmrMonthName(month, "en-US"))).toEqual([
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ]);
    });

    it("capitalizes the month name in languages that write it in lowercase", () => {
        expect(["202501", "202509"].map(month => formatWmrMonthName(month, "es"))).toEqual(["Enero", "Septiembre"]);
    });
});
