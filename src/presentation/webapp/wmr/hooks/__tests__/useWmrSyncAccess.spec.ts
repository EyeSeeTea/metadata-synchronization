import { describe, expect, it, vi } from "vitest";
import { toWmrSyncAccessState } from "../useWmrSyncAccess";

vi.hoisted(() => {
    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: { getItem: () => null },
    });
});

describe("toWmrSyncAccessState", () => {
    it("enables the sync when the access is ok", () => {
        expect(toWmrSyncAccessState({ type: "ok" })).toEqual({ type: "ok" });
    });

    it("asks for data write sharing on the data set", () => {
        expect(toWmrSyncAccessState({ type: "noDataWrite", dataSet: "MAL - WMR Form - Country Sync" })).toEqual({
            type: "error",
            message:
                "You cannot enter data in MAL - WMR Form - Country Sync. Ask an administrator for data write sharing.",
        });
    });

    it("names the org units outside the data capture org units", () => {
        expect(toWmrSyncAccessState({ type: "outsideCapture", orgUnitNames: ["Badjia", "Baoma"] })).toEqual({
            type: "error",
            message: "Badjia, Baoma are outside your data capture organisation units.",
        });
    });
});
