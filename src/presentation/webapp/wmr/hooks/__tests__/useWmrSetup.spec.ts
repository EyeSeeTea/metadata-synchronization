import { describe, expect, it, vi } from "vitest";
import { isWmrSetupReady, toWmrSetupStatus, WmrSetupStatuses } from "../useWmrSetup";

vi.hoisted(() => {
    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: { getItem: () => null },
    });
});

const allDone: WmrSetupStatuses = {
    metadata: { status: "done" },
    dataStore: { status: "done" },
    countryFormMonthly: { status: "done" },
};

const buildStatuses = (overrides: Partial<WmrSetupStatuses>): WmrSetupStatuses => ({ ...allDone, ...overrides });

describe("toWmrSetupStatus", () => {
    it("maps each requisite check to its setup status", () => {
        expect([
            toWmrSetupStatus({ type: "installed" }),
            toWmrSetupStatus({ type: "missing" }),
            toWmrSetupStatus({ type: "misassigned", dataSetName: "Country Sync" }),
        ]).toEqual([{ status: "done" }, { status: "pending" }, { status: "misassigned", dataSetName: "Country Sync" }]);
    });
});

describe("isWmrSetupReady", () => {
    it("is ready when both requisites are done", () => {
        expect(isWmrSetupReady(allDone)).toBe(true);
    });

    it("does not wait for the monthly form package, which the global flow does not require", () => {
        expect(isWmrSetupReady(buildStatuses({ countryFormMonthly: { status: "pending" } }))).toBe(true);
    });

    it("is not ready while any single requisite is not done", () => {
        expect([
            isWmrSetupReady(buildStatuses({ metadata: { status: "pending" } })),
            isWmrSetupReady(buildStatuses({ dataStore: { status: "loading" } })),
            isWmrSetupReady(buildStatuses({ metadata: { status: "misassigned", dataSetName: "x" } })),
        ]).toEqual([false, false, false]);
    });
});
