import { describe, expect, it, vi } from "vitest";
import { describeWmrSyncPeriod } from "../WmrSyncPeriod";

vi.hoisted(() => {
    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: { getItem: () => null },
    });
});

describe("describeWmrSyncPeriod", () => {
    it("shows the year of a yearly sync", () => {
        expect(describeWmrSyncPeriod("2025", false, "en-US")).toBe("Period: 2025");
    });

    it("shows the months summed into the year with the given locale", () => {
        expect(describeWmrSyncPeriod("2025", true, "en-US")).toBe("Period: 2025, sum of January 2025 to December 2025");
    });

    it("names the months in the language of the locale", () => {
        expect(describeWmrSyncPeriod("2025", true, "es")).toBe(
            "Period: 2025, sum of enero de 2025 to diciembre de 2025"
        );
    });
});
