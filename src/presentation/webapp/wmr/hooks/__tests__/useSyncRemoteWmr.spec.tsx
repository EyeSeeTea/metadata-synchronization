import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WmrSyncRule } from "../../context/WmrContext";
import { summarizeWmrRemoteSync, useSyncRemoteWmr } from "../useSyncRemoteWmr";
import { SynchronizationReport } from "../../../../../domain/reports/entities/SynchronizationReport";
import { SynchronizationResult } from "../../../../../domain/reports/entities/SynchronizationResult";

vi.mock("../../../../../utils/i18n", () => ({ default: { t: (message: string) => message } }));

const mocks = vi.hoisted(() => ({
    prepare: vi.fn(),
    syncDataset: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    useWmrContext: vi.fn(),
    saveReport: vi.fn(),
}));

vi.mock("@eyeseetea/d2-ui-components", () => ({
    useLoading: () => ({ isLoading: false, show: mocks.show, hide: mocks.hide }),
}));
vi.mock("../../../../react/core/contexts/AppContext", () => ({
    useAppContext: () => ({
        compositionRoot: {
            sync: { prepare: mocks.prepare },
            wmr: { syncDataset: mocks.syncDataset },
            reports: { save: mocks.saveReport },
        },
    }),
}));
vi.mock("../../context/WmrContext", () => ({ useWmrContext: mocks.useWmrContext }));
vi.mock("../useMappingDataElements", () => ({ useMappingDataElements: () => ({ dataElementsToMigrate: ["de-1"] }) }));
vi.mock("../../../../../domain/entities/wmr/entities/WmrSyncFlow", () => ({
    getWmrReportedYear: () => "2026",
    getWmrRangeMonths: () => ["202601", "202602", "202603"],
}));

const container = document.createElement("div");
let renderedSync: (() => Promise<void>) | undefined;
let renderedResult: unknown;
const instance = { id: "instance-1", url: "https://target.example", name: "Target" };
const ruleUpdated = {
    updateBuilder: vi.fn().mockReturnThis(),
    updateDataSyncEnableAggregation: vi.fn().mockReturnThis(),
    updateDataSyncAggregationType: vi.fn().mockReturnThis(),
    updateDataSyncOrgUnitPaths: vi.fn().mockReturnThis(),
    updateBuilderDataParams: vi.fn().mockReturnThis(),
    toBuilder: vi.fn().mockReturnValue({}),
    type: "data",
};
const rule = {
    dataParams: {},
    updateTargetInstances: vi.fn().mockReturnValue(ruleUpdated),
};

function HookProbe() {
    const hook = useSyncRemoteWmr({ instance: instance as never, targetOrgUnitId: "target-ou" });
    renderedSync = hook.syncRemoteWmr;
    renderedResult = hook.wmrRemoteSyncResult;
    return null;
}

function renderForFlow(kind: "global" | "regional", prepared = kind === "global", mappedId = "target-parent") {
    const syncRule = { flow: { kind, destination: { id: "global-target-data-set" } }, rule } as unknown as WmrSyncRule;
    mocks.useWmrContext.mockReturnValue({
        settings: {
            countryOrgUnit: { id: "country", path: "/country" },
            getSourceMetadataIds: () => ["de-1"],
        },
        syncRule,
        regionalOutputOrgUnits: [{ id: "parent", path: "/country/parent" }],
        orgUnitMapping: { parent: { mappedId } },
        regionalMonthRange: { from: "202601", to: "202603" },
        regionalPrepared: prepared,
        targetDataSetId: "target-data-set",
    });
    act(() => {
        ReactDOM.render(<HookProbe />, container);
    });
}

beforeEach(() => {
    mocks.prepare.mockReset();
    mocks.syncDataset.mockReset();
    mocks.show.mockReset();
    mocks.hide.mockReset();
    mocks.saveReport.mockReset();
    rule.updateTargetInstances.mockClear();
    ruleUpdated.updateBuilder.mockClear();
    mocks.prepare.mockResolvedValue({
        match: async (handlers: { success: () => Promise<void>; error: (code: string) => Promise<void> }) =>
            handlers.success(),
    });
    mocks.syncDataset.mockReturnValue({
        execute: async function* () {
            yield { done: true };
        },
    });
});

afterEach(() => {
    act(() => {
        ReactDOM.unmountComponentAtNode(container);
    });
    renderedSync = undefined;
    renderedResult = undefined;
});

describe("useSyncRemoteWmr submission readiness", () => {
    it("blocks regional sending until the selected months have been prepared", async () => {
        renderForFlow("regional");

        await act(async () => renderedSync?.());

        expect(mocks.prepare).not.toHaveBeenCalled();
        expect(mocks.syncDataset).not.toHaveBeenCalled();
        expect(renderedResult).toEqual({ type: "error", message: "Prepare the selected monthly data before sending." });
    });

    it("still prepares and executes a global submission", async () => {
        const execute = vi.fn(async function* () {
            yield { done: true };
        });
        mocks.syncDataset.mockReturnValue({ execute });
        renderForFlow("global");

        await act(async () => renderedSync?.());

        expect(mocks.prepare).toHaveBeenCalledTimes(1);
        expect(mocks.syncDataset).toHaveBeenCalledTimes(1);
        expect(execute).toHaveBeenCalledWith({
            orgUnitIdOverride: "target-ou",
            periods: ["2026"],
        });
        expect(renderedResult).toEqual({ type: "error", message: "Synchronization did not return a report." });
        expect(mocks.hide).toHaveBeenCalledTimes(1);
    });

    it.each(["", "DISABLED"])("blocks regional sending for a missing or disabled OU mapping (%s)", async mappedId => {
        renderForFlow("regional", true, mappedId);

        await act(async () => renderedSync?.());

        expect(mocks.prepare).not.toHaveBeenCalled();
        expect(mocks.syncDataset).not.toHaveBeenCalled();
        expect(renderedResult).toEqual({
            type: "error",
            message: "Map every selected output organisation unit to the target instance before sending.",
        });
    });

    it("sends the prepared regional months to the selected dataset without rebuilding analytics", async () => {
        const report = buildReport([{ status: "SUCCESS", stats }]);
        const execute = vi.fn(async function* () {
            yield { done: true, syncReport: report };
        });
        mocks.syncDataset.mockReturnValue({ execute });
        renderForFlow("regional", true);

        await act(async () => renderedSync?.());

        expect(ruleUpdated.updateBuilderDataParams).toHaveBeenCalledWith({
            runAnalyticsBefore: false,
            runAnalyticsAfter: false,
        });
        expect(ruleUpdated.updateDataSyncEnableAggregation).toHaveBeenCalledWith(false);
        expect(ruleUpdated.updateDataSyncOrgUnitPaths).toHaveBeenCalledWith(["/country/parent"]);
        expect(execute).toHaveBeenCalledWith({
            orgUnitIdOverride: undefined,
            periods: ["202601", "202602", "202603"],
            targetDataSetId: "target-data-set",
        });
        expect(mocks.saveReport).toHaveBeenCalledWith(report);
        expect(renderedResult).toEqual({ type: "success", stats });
        expect(mocks.hide).toHaveBeenCalledTimes(1);
    });

    it("surfaces preparation failures and clears loading", async () => {
        mocks.prepare.mockResolvedValue({
            match: async (handlers: { error: (code: string) => Promise<void> }) => handlers.error("forbidden"),
        });
        renderForFlow("regional", true);

        await act(async () => renderedSync?.());

        expect(renderedResult).toEqual({ type: "error", message: "Failed to prepare synchronization rule: forbidden" });
        expect(mocks.hide).toHaveBeenCalledTimes(1);
    });

    it("surfaces thrown transfer errors and clears loading", async () => {
        mocks.syncDataset.mockReturnValue({
            execute: async function* () {
                yield { message: "Connecting" };
                throw new Error("Target unavailable");
            },
        });
        renderForFlow("regional", true);

        await act(async () => renderedSync?.());

        expect(renderedResult).toEqual({ type: "error", message: "Target unavailable" });
        expect(mocks.hide).toHaveBeenCalledTimes(1);
    });
});

const stats = { imported: 3, updated: 0, ignored: 0, deleted: 0 };

function buildReport(results: ReadonlyArray<Partial<SynchronizationResult>>, status: "DONE" | "FAILURE" = "DONE") {
    const report = SynchronizationReport.build({ type: "aggregated", user: "test", status, types: [] });
    results.forEach((result, index) =>
        report.addSyncResult({
            type: "aggregated",
            status: "SUCCESS",
            instance: { id: `target-${index}`, name: "Target" },
            date: new Date("2026-01-01T00:00:00Z"),
            ...result,
        })
    );
    return report;
}

describe("summarizeWmrRemoteSync", () => {
    it("rejects an empty report", () => {
        expect(summarizeWmrRemoteSync(buildReport([]))).toEqual({
            type: "error",
            message: "Synchronization did not return a completed result.",
        });
    });

    it("reports a failure even without a result", () => {
        expect(summarizeWmrRemoteSync(buildReport([], "FAILURE"))).toEqual({
            type: "error", message: "Synchronization failed.", stats: undefined,
        });
    });

    it("reports a network error even if another result succeeded", () => {
        expect(summarizeWmrRemoteSync(buildReport([
            { status: "NETWORK ERROR", message: "Connection lost" },
            { status: "SUCCESS", stats },
        ]))).toEqual({ type: "error", message: "Connection lost", stats: undefined });
    });

    it("surfaces import conflicts", () => {
        expect(summarizeWmrRemoteSync(buildReport([{
            status: "WARNING", errors: [{ id: "ou-1", message: "Organisation unit is not assigned" }], stats,
        }]))).toEqual({ type: "error", message: "Organisation unit is not assigned", stats });
    });
});
