import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WmrSyncRule } from "../../context/WmrContext";
import { useSyncRemoteWmr } from "../useSyncRemoteWmr";

vi.mock("../../../../../utils/i18n", () => ({ default: { t: (message: string) => message } }));

const mocks = vi.hoisted(() => ({
    prepare: vi.fn(),
    syncDataset: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    useWmrContext: vi.fn(),
}));

vi.mock("@eyeseetea/d2-ui-components", () => ({
    useLoading: () => ({ isLoading: false, show: mocks.show, hide: mocks.hide }),
}));
vi.mock("../../../../react/core/contexts/AppContext", () => ({
    useAppContext: () => ({
        compositionRoot: { sync: { prepare: mocks.prepare }, wmr: { syncDataset: mocks.syncDataset } },
    }),
}));
vi.mock("../../context/WmrContext", () => ({ useWmrContext: mocks.useWmrContext }));
vi.mock("../useMappingDataElements", () => ({ useMappingDataElements: () => ({ dataElementsToMigrate: ["de-1"] }) }));
vi.mock("../../../../../domain/entities/wmr/entities/WmrSyncFlow", () => ({ getWmrReportedYear: () => "2026" }));

const warning = "Regional submission is temporarily unavailable while monthly district reporting is being corrected.";
const container = document.createElement("div");
let renderedSync: (() => Promise<void>) | undefined;
let renderedResult: unknown;
const instance = { id: "instance-1", url: "https://target.example", name: "Target" };
const ruleUpdated = {
    updateBuilder: vi.fn().mockReturnThis(),
    updateDataSyncEnableAggregation: vi.fn().mockReturnThis(),
    updateDataSyncAggregationType: vi.fn().mockReturnThis(),
    updateDataSyncOrgUnitPaths: vi.fn().mockReturnThis(),
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

function renderForFlow(kind: "global" | "regional") {
    const syncRule = { flow: { kind }, rule } as unknown as WmrSyncRule;
    mocks.useWmrContext.mockReturnValue({
        settings: { countryOrgUnit: { id: "country", path: "/country" } },
        syncRule,
        regionalParents: [{ id: "parent", path: "/country/parent" }],
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

describe("useSyncRemoteWmr regional submission guard", () => {
    it("blocks direct regional send calls before prepare or execute and returns the warning", async () => {
        renderForFlow("regional");

        await act(async () => renderedSync?.());

        expect(mocks.prepare).not.toHaveBeenCalled();
        expect(mocks.syncDataset).not.toHaveBeenCalled();
        expect(renderedResult).toEqual({ type: "error", message: warning });
    });

    it("still prepares and executes a global submission", async () => {
        renderForFlow("global");

        await act(async () => renderedSync?.());

        expect(mocks.prepare).toHaveBeenCalledTimes(1);
        expect(mocks.syncDataset).toHaveBeenCalledTimes(1);
    });
});
