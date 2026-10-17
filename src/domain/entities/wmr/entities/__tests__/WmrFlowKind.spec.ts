import { describe, expect, it } from "vitest";
import { isWmrAggregationEnabled, wmrFlowDefinitions } from "../WmrFlowKind";

describe("WmrFlowKind", () => {
    describe("wmrFlowDefinitions", () => {
        it("copies the yearly country form to the country, aggregating yearly only with indicators", () => {
            expect(wmrFlowDefinitions.global).toEqual({
                sourcePeriodType: "Yearly",
                requisites: ["metadata", "dataStore"],
                destinationOrgUnits: "country",
                targetOrgUnit: "override",
                aggregation: "withIndicators",
                aggregationType: "YEARLY",
                sumIntoYear: false,
            });
        });

        it("aggregates the monthly country form by month into the parents and sums the year", () => {
            expect(wmrFlowDefinitions.regional).toEqual({
                sourcePeriodType: "Monthly",
                requisites: ["metadata", "dataStore", "countryFormMonthly"],
                destinationOrgUnits: "parents",
                targetOrgUnit: "mapping",
                aggregation: "always",
                aggregationType: "MONTHLY",
                sumIntoYear: true,
            });
        });
    });

    describe("isWmrAggregationEnabled", () => {
        it("always aggregates the regional flow", () => {
            expect(isWmrAggregationEnabled(wmrFlowDefinitions.regional, [])).toBe(true);
        });

        it("aggregates the global flow when there are mapped indicators", () => {
            expect(isWmrAggregationEnabled(wmrFlowDefinitions.global, ["Uvn6LCg7dVU"])).toBe(true);
        });

        it("copies the global flow raw without mapped indicators", () => {
            expect(isWmrAggregationEnabled(wmrFlowDefinitions.global, [])).toBe(false);
        });
    });
});
