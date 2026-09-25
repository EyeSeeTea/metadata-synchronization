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

const buildStatsReport = (imported: number, updated: number, ignored: number) =>
    buildReport({ status: "SUCCESS", stats: { imported, updated, ignored, deleted: 0 } });

describe("summarizeWmrLocalSync", () => {
    it("reports a failed result as an error", () => {
        expect(summarizeWmrLocalSync(buildReport({ status: "ERROR", message: "Source unavailable" }))).toEqual({
            type: "error",
            message: "Source unavailable",
        });
    });

    it("reports the import conflicts instead of the import description", () => {
        const periodNotOpen = "Period: `202505` is not open for this data set at this time: `CWuqJ3dtQC4`";
        const report = buildReport({
            status: "WARNING",
            message: "Import process completed successfully",
            stats: { imported: 0, updated: 0, ignored: 10, deleted: 0 },
            errors: [
                { id: "202505", message: periodNotOpen },
                { id: "202505", message: periodNotOpen },
            ],
        });

        expect(summarizeWmrLocalSync(report)).toEqual({ type: "error", message: periodNotOpen });
    });

    it("reports created, updated and unchanged values when any value was written", () => {
        expect(summarizeWmrLocalSync(buildStatsReport(2, 3, 1))).toEqual({
            type: "success",
            message: "2 created, 3 updated, 1 unchanged",
        });
    });

    it("reports an info when every value was already up to date", () => {
        expect(summarizeWmrLocalSync(buildStatsReport(0, 0, 4))).toEqual({
            type: "info",
            message: "The 4 values were already up to date",
        });
    });

    it("reports a warning when the period has no values for the mapped data elements", () => {
        expect(summarizeWmrLocalSync(buildStatsReport(0, 0, 0))).toEqual({
            type: "warning",
            message: "There are no values for the mapped data elements in the period",
        });
    });
});
