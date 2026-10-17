import { describe, expect, it, vi } from "vitest";
import { wmrFlowDefinitions } from "../../../../../domain/entities/wmr/entities/WmrFlowKind";
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
    const globalRequisites = wmrFlowDefinitions.global.requisites;
    const regionalRequisites = wmrFlowDefinitions.regional.requisites;

    it("is ready when every requisite of the flow is done", () => {
        expect([isWmrSetupReady(allDone, globalRequisites), isWmrSetupReady(allDone, regionalRequisites)]).toEqual([
            true,
            true,
        ]);
    });

    it("only waits for the monthly form package in the flow that requires it", () => {
        const statuses = buildStatuses({ countryFormMonthly: { status: "pending" } });

        expect([isWmrSetupReady(statuses, globalRequisites), isWmrSetupReady(statuses, regionalRequisites)]).toEqual([
            true,
            false,
        ]);
    });

    it("is not ready while any single requisite is not done", () => {
        expect([
            isWmrSetupReady(buildStatuses({ metadata: { status: "pending" } }), globalRequisites),
            isWmrSetupReady(buildStatuses({ dataStore: { status: "loading" } }), globalRequisites),
            isWmrSetupReady(buildStatuses({ metadata: { status: "misassigned", dataSetName: "x" } }), globalRequisites),
        ]).toEqual([false, false, false]);
    });
});
