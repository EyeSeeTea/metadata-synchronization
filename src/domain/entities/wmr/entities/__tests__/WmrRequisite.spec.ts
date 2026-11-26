import { describe, expect, it } from "vitest";
import { checkWmrRequisiteDataSet } from "../WmrRequisite";

const dataSetName = "MAL - WMR Form - Country Sync";
const country = "ImspTQPwCqd";
const badjia = "YuQRtpLP10I";
const baoma = "vWbkYPRmKyS";

function dataSet(orgUnitIds: ReadonlyArray<string>) {
    return { name: dataSetName, orgUnitIds };
}

describe("checkWmrRequisiteDataSet", () => {
    it("reports a missing dataSet", () => {
        expect(checkWmrRequisiteDataSet(undefined, country, true)).toEqual({ type: "missing" });
    });

    describe("when the country is required", () => {
        it("reports a dataSet assigned only to the country as installed", () => {
            expect(checkWmrRequisiteDataSet(dataSet([country]), country, true)).toEqual({ type: "installed" });
        });

        it("reports a dataSet assigned to the country and the parents as installed", () => {
            expect(checkWmrRequisiteDataSet(dataSet([country, badjia, baoma]), country, true)).toEqual({
                type: "installed",
            });
        });

        it("reports a dataSet not assigned to the country as misassigned", () => {
            expect(checkWmrRequisiteDataSet(dataSet([badjia, baoma]), country, true)).toEqual({
                type: "misassigned",
                dataSetName,
            });
        });
    });

    describe("when the country is not required", () => {
        it("reports a dataSet not assigned to the country as installed", () => {
            expect(checkWmrRequisiteDataSet(dataSet([badjia, baoma]), country, false)).toEqual({ type: "installed" });
        });
    });
});
