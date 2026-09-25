import { Server } from "miragejs";
import { DataSynchronizationParams } from "../../../domain/aggregated/entities/DataSynchronizationParams";
import { Instance } from "../../../domain/instance/entities/Instance";
import { startDhis } from "../../../utils/dhisServer";
import { AggregatedD2ApiRepository } from "../AggregatedD2ApiRepository";

const baseUrl = "http://origin.test";
const dataElementId = "dataElement1";
const orgUnitId = "countryRoot";

const localInstance = Instance.build({ url: baseUrl, name: "Testing", version: "2.40", type: "local" });

const dataParams: DataSynchronizationParams = {
    orgUnitPaths: [`/${orgUnitId}`],
    period: "FIXED",
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 11, 31),
    aggregationType: "YEARLY",
};

describe("AggregatedD2ApiRepository", () => {
    let server: Server;
    let requestedUrls: string[];
    let requestedDataValueSetUrls: string[];

    beforeEach(() => {
        requestedUrls = [];
        requestedDataValueSetUrls = [];
        server = startDhis({ urlPrefix: baseUrl });

        server.get("/metadata", async () => ({ categoryOptionCombos: [{ id: "defaultCoc" }] }));
        server.get("/analytics/dataValueSet.json", async (_schema, request) => {
            requestedUrls.push(request.url);
            return { dataValues: [] };
        });
        server.get("/dataValueSets", async (_schema, request) => {
            requestedDataValueSetUrls.push(request.url);
            return { dataValues: [] };
        });
    });

    afterEach(() => {
        server.shutdown();
    });

    describe("getAnalytics", () => {
        it("requests the categoryOptionCombo dimension when category option combos are included", async () => {
            const repository = new AggregatedD2ApiRepository(localInstance, localInstance);

            await repository.getAnalytics({
                dataParams,
                dimensionIds: [dataElementId],
                includeCategories: true,
                includeCategoryOptionCombos: true,
            });

            expect(requestedDimensions()).toEqual([[`dx:${dataElementId}`, "pe:2025", `ou:${orgUnitId}`, "co"]]);
        });

        it("omits the categoryOptionCombo dimension by default", async () => {
            const repository = new AggregatedD2ApiRepository(localInstance, localInstance);

            await repository.getAnalytics({
                dataParams,
                dimensionIds: [dataElementId],
                includeCategories: true,
            });

            expect(requestedDimensions()).toEqual([[`dx:${dataElementId}`, "pe:2025", `ou:${orgUnitId}`]]);
        });
    });

    describe("getAggregated", () => {
        const dataSetId = "dataSet1";

        it("filters by the given periods instead of the date range", async () => {
            const repository = new AggregatedD2ApiRepository(localInstance, localInstance);

            await repository.getAggregated(dataParams, [dataSetId], [], ["202501", "202502"]);

            expect(requestedPeriodFilters()).toEqual([
                { period: ["202501", "202502"], startDate: null, endDate: null },
            ]);
        });

        it("filters by the date range when no periods are given", async () => {
            const repository = new AggregatedD2ApiRepository(localInstance, localInstance);

            await repository.getAggregated(dataParams, [dataSetId], []);

            expect(requestedPeriodFilters()).toEqual([{ period: [], startDate: "2025-01-01", endDate: "2025-12-31" }]);
        });
    });

    function requestedPeriodFilters() {
        return requestedDataValueSetUrls.map(url => {
            const { searchParams } = new URL(url, baseUrl);
            return {
                period: searchParams.getAll("period"),
                startDate: searchParams.get("startDate"),
                endDate: searchParams.get("endDate"),
            };
        });
    }

    function requestedDimensions(): string[][] {
        return requestedUrls.map(url => new URL(url, baseUrl).searchParams.getAll("dimension"));
    }
});
