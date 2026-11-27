import { buildAggregatedSyncResult } from "../AggregatedD2ApiRepository";

const instance = { id: "remote", name: "Remote instance" };

describe("buildAggregatedSyncResult", () => {
    it("maps an import summary to its status, stats and conflicts", () => {
        const importSummary = {
            status: "WARNING",
            description: "Import process completed with conflicts",
            importCount: { imported: 1, updated: 0, ignored: 1, deleted: 0 },
            conflicts: [{ object: "dataElement1", value: "Data element not found" }],
        };

        const result = buildAggregatedSyncResult(importSummary, instance);

        expect(result.status).toEqual("WARNING");
        expect(result.stats).toEqual({ imported: 1, updated: 0, ignored: 1, deleted: 0 });
        expect(result.errors).toEqual([{ id: "dataElement1", message: "Data element not found" }]);
    });

    it("returns an error for an HTML error page instead of reporting the import as done", () => {
        const htmlPage = "<html><head><title>Server Error</title></head><body>Server Error 415</body></html>";

        const result = buildAggregatedSyncResult(htmlPage, instance, 415);

        expect(result.status).toEqual("ERROR");
        expect(result.message).toContain("HTTP 415");
        expect(result.message).toContain("Server Error 415");
        expect(result.stats).toBeUndefined();
    });

    it("returns an error for an empty response", () => {
        const result = buildAggregatedSyncResult("", instance);

        expect(result.status).toEqual("ERROR");
    });
});
