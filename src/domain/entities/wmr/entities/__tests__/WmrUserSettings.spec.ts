import { describe, expect, it } from "vitest";
import { emptyWmrUserSettings, withTargetOrgUnit } from "../WmrUserSettings";

describe("WmrUserSettings", () => {
    describe("withTargetOrgUnit", () => {
        it("stores the org unit of a new instance and keeps the others", () => {
            const settings = { targetOrgUnitByInstance: { instanceA: "orgUnitA" } };

            expect(withTargetOrgUnit(settings, "instanceB", "orgUnitB")).toEqual({
                targetOrgUnitByInstance: { instanceA: "orgUnitA", instanceB: "orgUnitB" },
            });
        });

        it("replaces the org unit of an existing instance", () => {
            const settings = withTargetOrgUnit(emptyWmrUserSettings, "instanceA", "orgUnitA");

            expect(withTargetOrgUnit(settings, "instanceA", "orgUnitB")).toEqual({
                targetOrgUnitByInstance: { instanceA: "orgUnitB" },
            });
        });
    });
});
