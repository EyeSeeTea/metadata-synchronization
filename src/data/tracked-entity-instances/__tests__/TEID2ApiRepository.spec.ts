import { buildTEIOrgUnitParams } from "../TEID2ApiRepository";

describe("buildTEIOrgUnitParams", () => {
    const ORG_UNITS = ["ou1", "ou2"];

    it("uses the legacy params before 2.41", () => {
        expect(buildTEIOrgUnitParams(40, ORG_UNITS)).toEqual({ orgUnit: "ou1;ou2", ouMode: "SELECTED" });
    });

    it.each([41, 42])("uses the new params from 2.%i", apiVersion => {
        expect(buildTEIOrgUnitParams(apiVersion, ORG_UNITS)).toEqual({
            orgUnits: "ou1,ou2",
            orgUnitMode: "SELECTED",
        });
    });
});
