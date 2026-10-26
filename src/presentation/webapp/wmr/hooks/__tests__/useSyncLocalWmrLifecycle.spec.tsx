import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSyncLocalWmr } from "../useSyncLocalWmr";

vi.mock("../../../../../utils/i18n", () => ({ default: { t: (message: string) => message } }));

const mocks = vi.hoisted(() => ({
    prepare: vi.fn(),
    syncDataset: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    save: vi.fn(),
    setPrepared: vi.fn(),
    context: {} as Record<string, unknown>,
}));

vi.mock("@eyeseetea/d2-ui-components", () => ({
    useLoading: () => ({ isLoading: false, show: mocks.show, hide: mocks.hide }),
}));
vi.mock("../../../../react/core/contexts/AppContext", () => ({
    useAppContext: () => ({
        compositionRoot: {
            sync: { prepare: mocks.prepare },
            wmr: { syncDataset: mocks.syncDataset },
            reports: { save: mocks.save },
        },
    }),
}));
vi.mock("../../context/WmrContext", () => ({ useWmrContext: () => mocks.context }));
vi.mock("../useMappingDataElements", () => ({
    useMappingDataElements: () => ({ dataElementsToMigrate: ["de-1"] }),
    getWmrSyncIds: () => ({ metadataIds: ["de-1"], mappedIndicatorIds: [] }),
}));
vi.mock("../../../../../domain/entities/wmr/entities/WmrSyncFlow", async () => {
    const actual = await vi.importActual<typeof import("../../../../../domain/entities/wmr/entities/WmrSyncFlow")>(
        "../../../../../domain/entities/wmr/entities/WmrSyncFlow"
    );
    return { ...actual, getWmrReportedYear: () => "2026", getWmrRangeMonths: () => ["202601", "202602"] };
});

const container = document.createElement("div");
let renderedSync: (() => Promise<void>) | undefined;
let contextValue: Record<string, unknown>;

const updatedRule = {
    updateBuilder: vi.fn().mockReturnThis(),
    updateDataSyncEnableAggregation: vi.fn().mockReturnThis(),
    updateDataSyncAggregationType: vi.fn().mockReturnThis(),
    updateDataSyncOrgUnitPaths: vi.fn().mockReturnThis(),
    updateBuilderDataParams: vi.fn().mockReturnThis(),
    updateDataSyncPeriod: vi.fn().mockReturnThis(),
    updateDataSyncStartDate: vi.fn().mockReturnThis(),
    updateDataSyncEndDate: vi.fn().mockReturnThis(),
    toBuilder: vi.fn().mockReturnValue({}),
    type: "aggregated",
    dataParams: {},
};
const rule = { updateBuilder: vi.fn().mockReturnValue(updatedRule), dataParams: {} };
const report = {
    status: "SUCCESS",
    getResults: () => [{ status: "SUCCESS", stats: { imported: 1, updated: 0, ignored: 0 } }],
} as never;

function HookProbe() {
    renderedSync = useSyncLocalWmr().syncLocalWmr;
    return null;
}

function render(monthRange = { from: "202601", to: "202602" }) {
    contextValue = {
        settings: {
            countryOrgUnit: { id: "country", path: "/country" },
            getSourceMetadataIds: () => ["de-1"],
        },
        syncRule: {
            flow: { kind: "regional", source: {}, destination: { id: "staging" } },
            localDataSetId: "source-dataset",
            rule,
        },
        regionalOutputOrgUnits: [{ id: "district", path: "/country/district" }],
        regionalMonthRange: monthRange,
        setRegionalPrepared: mocks.setPrepared,
    };
    mocks.context = contextValue;
    act(() => {
        ReactDOM.render(<HookProbe />, container);
    });
}

function successfulPreparation() {
    mocks.prepare.mockResolvedValue({ match: async (handlers: { success: () => Promise<void> }) => handlers.success() });
    mocks.syncDataset.mockReturnValue({
        execute: async function* () {
            yield { done: true, syncReport: report };
        },
    });
}

beforeEach(() => {
    mocks.prepare.mockReset();
    mocks.syncDataset.mockReset();
    mocks.show.mockReset();
    mocks.hide.mockReset();
    mocks.save.mockReset();
    mocks.setPrepared = vi.fn();
    updatedRule.updateBuilder.mockClear();
    rule.updateBuilder.mockClear();
    successfulPreparation();
});

afterEach(() => {
    act(() => {
        ReactDOM.unmountComponentAtNode(container);
    });
    renderedSync = undefined;
});

describe("useSyncLocalWmr preparation lifecycle", () => {
    it("marks regional preparation ready after a nonempty successful sync", async () => {
        render();
        await act(async () => {
            await renderedSync?.();
        });

        expect(mocks.setPrepared).toHaveBeenNthCalledWith(1, false);
        expect(mocks.setPrepared).toHaveBeenNthCalledWith(2, true);
    });

    it("clears previous readiness before a retry that fails preparation", async () => {
        render();
        mocks.prepare.mockResolvedValue({ match: async (handlers: { error: (code: string) => Promise<void> }) => handlers.error("denied") });
        await act(async () => {
            await renderedSync?.();
        });

        expect(mocks.setPrepared).toHaveBeenCalledWith(false);
        expect(mocks.setPrepared).not.toHaveBeenCalledWith(true);
    });

    it.each([
        ["empty", { status: "SUCCESS", getResults: () => [] }],
        ["conflict", { status: "FAILURE", getResults: () => [{ status: "ERROR", errors: [{ message: "conflict" }] }] }],
    ])("does not mark %s results ready", async (_name, syncReport) => {
        mocks.setPrepared.mockClear();
        mocks.syncDataset.mockReturnValue({
            execute: async function* () {
                yield { done: true, syncReport };
            },
        });
        render();
        await act(async () => {
            await renderedSync?.();
        });
        expect(mocks.setPrepared).not.toHaveBeenCalledWith(true);
    });

    it("ignores delayed successful preparation after the hook unmounts", async () => {
        let resolvePreparation: ((value: unknown) => void) | undefined;
        mocks.prepare.mockReturnValue(new Promise(resolve => (resolvePreparation = resolve)));
        render();
        let pending: Promise<void> | undefined;
        await act(async () => {
            pending = renderedSync?.();
        });
        act(() => {
            ReactDOM.unmountComponentAtNode(container);
        });
        resolvePreparation?.({ match: async (handlers: { success: () => Promise<void> }) => handlers.success() });
        await act(async () => {
            await pending;
        });

        expect(mocks.setPrepared).not.toHaveBeenCalledWith(true);
    });

    it("ignores delayed success when the selected month range changes", async () => {
        let resolvePreparation: ((value: unknown) => void) | undefined;
        mocks.prepare.mockReturnValue(new Promise(resolve => (resolvePreparation = resolve)));
        render();
        let pending: Promise<void> | undefined;
        await act(async () => {
            pending = renderedSync?.();
        });
        render({ from: "202603", to: "202604" });
        resolvePreparation?.({ match: async (handlers: { success: () => Promise<void> }) => handlers.success() });
        await act(async () => {
            await pending;
        });

        expect(mocks.setPrepared).not.toHaveBeenCalledWith(true);
        expect(contextValue.syncRule).toMatchObject({ rule });
    });
});
