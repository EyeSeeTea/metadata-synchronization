import { describe, expect, it } from "vitest";
import { getWmrSetupBlocker, WmrSetupState } from "../WmrSetup";
import { WmrLevelOrgUnit } from "../WmrOrgUnits";

const badjia: WmrLevelOrgUnit = {
    id: "YuQRtpLP10I",
    name: "Badjia",
    level: 3,
    path: "/ImspTQPwCqd/O6uvpzGd5pu/YuQRtpLP10I",
};
const baoma: WmrLevelOrgUnit = {
    id: "vWbkYPRmKyS",
    name: "Baoma",
    level: 3,
    path: "/ImspTQPwCqd/O6uvpzGd5pu/vWbkYPRmKyS",
};

const readyGlobal: WmrSetupState = {
    flowKind: "global",
    requisitesReady: true,
    hasTargetInstance: true,
    regionalParents: [],
    orgUnitMapping: undefined,
};

const readyRegional: WmrSetupState = {
    ...readyGlobal,
    flowKind: "regional",
    regionalParents: [badjia, baoma],
    orgUnitMapping: { [badjia.id]: { mappedId: "targetBadjia" }, [baoma.id]: { mappedId: "targetBaoma" } },
};

describe("getWmrSetupBlocker", () => {
    describe("global flow", () => {
        it("lets the user proceed with the flow, its requisites and a target instance", () => {
            expect(getWmrSetupBlocker(readyGlobal)).toBe(undefined);
        });

        it("reports the first missing step in order", () => {
            expect([
                getWmrSetupBlocker({ ...readyGlobal, flowKind: undefined, requisitesReady: false }),
                getWmrSetupBlocker({ ...readyGlobal, requisitesReady: false, hasTargetInstance: false }),
                getWmrSetupBlocker({ ...readyGlobal, hasTargetInstance: false }),
            ]).toEqual([{ type: "noFlow" }, { type: "requisites" }, { type: "targetInstance" }]);
        });
    });

    describe("regional flow", () => {
        it("lets the user proceed when every parent is mapped to its own target", () => {
            expect(getWmrSetupBlocker(readyRegional)).toBe(undefined);
        });

        it("requires an assigned level before the mapping", () => {
            expect(getWmrSetupBlocker({ ...readyRegional, regionalParents: [], orgUnitMapping: undefined })).toEqual({
                type: "level",
            });
        });

        it("lets the user proceed with parents left unmapped or disabled", () => {
            expect([
                getWmrSetupBlocker({ ...readyRegional, orgUnitMapping: undefined }),
                getWmrSetupBlocker({ ...readyRegional, orgUnitMapping: { [badjia.id]: { mappedId: "DISABLED" } } }),
            ]).toEqual([undefined, undefined]);
        });

        it("names the parents mapped to the same target", () => {
            const orgUnitMapping = { [badjia.id]: { mappedId: "target" }, [baoma.id]: { mappedId: "target" } };

            expect(getWmrSetupBlocker({ ...readyRegional, orgUnitMapping })).toEqual({
                type: "duplicated",
                orgUnitNames: ["Badjia", "Baoma"],
            });
        });
    });
});
