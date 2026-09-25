import { describe, expect, it } from "vitest";
import { checkWmrRequisiteDataSet } from "../WmrRequisite";

const dataSetName = "MAL - WMR Form - Country Sync";

describe("checkWmrRequisiteDataSet", () => {
    it("reports a missing dataSet", () => {
        expect(checkWmrRequisiteDataSet(undefined)).toEqual({ type: "missing" });
    });

    it("reports a dataSet assigned to a single org unit as installed", () => {
        expect(checkWmrRequisiteDataSet({ name: dataSetName, orgUnitsCount: 1 })).toEqual({ type: "installed" });
    });

    it("reports a dataSet assigned to several org units as misassigned", () => {
        expect(checkWmrRequisiteDataSet({ name: dataSetName, orgUnitsCount: 3 })).toEqual({
            type: "misassigned",
            dataSetName,
            orgUnitsCount: 3,
        });
    });
});
