import { describe, expect, it, vi } from "vitest";
import { isWmrSetupBlocked, isWmrSetupReady, toWmrSetupStatus, WmrSetupStatuses } from "../useWmrSetup";

vi.hoisted(() => {
    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: { getItem: () => null },
    });
});

const allDone: WmrSetupStatuses = {
    metadata: { status: "done" },
    dataStore: { status: "done" },
    metadataMonthly: { status: "done" },
    dataStoreMonthly: { status: "done" },
};

const buildStatuses = (overrides: Partial<WmrSetupStatuses>): WmrSetupStatuses => ({ ...allDone, ...overrides });

describe("toWmrSetupStatus", () => {
    it("maps each requisite check to its setup status", () => {
        expect([
            toWmrSetupStatus({ type: "installed" }),
            toWmrSetupStatus({ type: "missing" }),
            toWmrSetupStatus({ type: "misassigned", dataSetName: "Country Sync", orgUnitsCount: 4 }),
        ]).toEqual([
            { status: "done" },
            { status: "pending" },
            { status: "misassigned", dataSetName: "Country Sync", orgUnitsCount: 4 },
        ]);
    });
});

describe("isWmrSetupReady", () => {
    it("is ready when the four requisites are done", () => {
        expect(isWmrSetupReady(allDone)).toBe(true);
    });

    it("is not ready while any single requisite is not done", () => {
        expect([
            isWmrSetupReady(buildStatuses({ metadata: { status: "pending" } })),
            isWmrSetupReady(buildStatuses({ dataStore: { status: "loading" } })),
            isWmrSetupReady(buildStatuses({ metadataMonthly: { status: "error" } })),
            isWmrSetupReady(
                buildStatuses({ dataStoreMonthly: { status: "misassigned", dataSetName: "x", orgUnitsCount: 2 } })
            ),
        ]).toEqual([false, false, false, false]);
    });
});

describe("isWmrSetupBlocked", () => {
    it("blocks the monthly metadata until the annual metadata is done", () => {
        expect([
            isWmrSetupBlocked("metadataMonthly", buildStatuses({ metadata: { status: "pending" } })),
            isWmrSetupBlocked("metadataMonthly", allDone),
        ]).toEqual([true, false]);
    });

    it("never blocks requisites without a prerequisite", () => {
        const nothingDone = buildStatuses({
            metadata: { status: "pending" },
            dataStore: { status: "pending" },
            metadataMonthly: { status: "pending" },
        });

        expect([
            isWmrSetupBlocked("metadata", nothingDone),
            isWmrSetupBlocked("dataStore", nothingDone),
            isWmrSetupBlocked("dataStoreMonthly", nothingDone),
        ]).toEqual([false, false, false]);
    });
});
