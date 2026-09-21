import { describe, expect, it, vi } from "vitest";
import { SynchronizationReport } from "../../../../../domain/reports/entities/SynchronizationReport";
import { summarizeWmrLocalSync } from "../useSyncLocalWmr";

vi.hoisted(() => {
    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: { getItem: () => null },
    });
});

const buildReport = (result: Record<string, unknown>, status = "DONE") => {
    const report = SynchronizationReport.build({
        type: "aggregated",
        user: "test-user",
        status: status as "DONE",
        types: [],
    });
    report.addSyncResult({
        instance: { id: "LOCAL", name: "This instance" },
        date: new Date("2026-01-01T00:00:00.000Z"),
        type: "aggregated",
        ...result,
    } as any);
    return report;
};

describe("summarizeWmrLocalSync", () => {
    it("reports a warning when the sync transfers no values", () => {
        expect(
            summarizeWmrLocalSync(
                buildReport({ status: "SUCCESS", stats: { imported: 0, updated: 0, ignored: 0, deleted: 0 } })
            )
        ).toEqual({
            type: "warning",
            message: "Synchronization completed, but no data values were transferred.",
            transferred: 0,
        });
    });

    it("reports the number of imported and updated values", () => {
        expect(
            summarizeWmrLocalSync(
                buildReport({ status: "SUCCESS", stats: { imported: 2, updated: 3, ignored: 1, deleted: 0 } })
            )
        ).toEqual({ type: "success", transferred: 5 });
    });

    it("reports a failed result as an error", () => {
        expect(summarizeWmrLocalSync(buildReport({ status: "ERROR", message: "Source unavailable" }))).toEqual({
            type: "error",
            message: "Source unavailable",
        });
    });
});
