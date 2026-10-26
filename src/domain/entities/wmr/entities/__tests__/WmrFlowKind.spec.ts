import { describe, expect, it } from "vitest";
import {
    getWmrDestinationOrgUnits,
    getWmrSubmitTarget,
    isWmrAggregationEnabled,
    wmrFlowDefinitions,
} from "../WmrFlowKind";

const sierraLeone = { id: "ImspTQPwCqd", name: "Sierra Leone", path: "/ImspTQPwCqd" };
const badjia = { id: "YuQRtpLP10I", name: "Badjia", path: "/ImspTQPwCqd/O6uvpzGd5pu/YuQRtpLP10I" };
const baoma = { id: "vWbkYPRmKyS", name: "Baoma", path: "/ImspTQPwCqd/O6uvpzGd5pu/vWbkYPRmKyS" };
const targetOrgUnitId = "TargetSL001";

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
            });
        });

        it("uses the monthly staging form at the selected output level without a data store prerequisite", () => {
            expect(wmrFlowDefinitions.regional).toEqual({
                sourcePeriodType: "Monthly",
                requisites: ["metadata", "countryFormMonthly", "regionalMonthlyStaging"],
                destinationOrgUnits: "selected",
                targetOrgUnit: "mapping",
                aggregation: "always",
                aggregationType: "MONTHLY",
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

    describe("getWmrDestinationOrgUnits", () => {
        it("writes the global flow into the country", () => {
            expect(getWmrDestinationOrgUnits(wmrFlowDefinitions.global, sierraLeone, [badjia, baoma])).toEqual([
                sierraLeone,
            ]);
        });

        it("writes the regional flow into the selected output units", () => {
            expect(getWmrDestinationOrgUnits(wmrFlowDefinitions.regional, sierraLeone, [badjia, baoma])).toEqual([
                badjia,
                baoma,
            ]);
        });
    });

    describe("getWmrSubmitTarget", () => {
        it("sends the global flow from the country, overriding the org unit with the target one", () => {
            expect(
                getWmrSubmitTarget(wmrFlowDefinitions.global, sierraLeone, [badjia, baoma], targetOrgUnitId)
            ).toEqual({ type: "ready", orgUnitPaths: [sierraLeone.path], orgUnitIdOverride: targetOrgUnitId });
        });

        it("cannot send the global flow without a target org unit", () => {
            expect(getWmrSubmitTarget(wmrFlowDefinitions.global, sierraLeone, [badjia, baoma], undefined)).toEqual({
                type: "missingOrgUnit",
            });
        });

        it("sends the regional flow from the selected output units without override, leaving the org units to the mapping", () => {
            expect(
                getWmrSubmitTarget(wmrFlowDefinitions.regional, sierraLeone, [badjia, baoma], targetOrgUnitId)
            ).toEqual({ type: "ready", orgUnitPaths: [badjia.path, baoma.path], orgUnitIdOverride: undefined });
        });
    });
});
