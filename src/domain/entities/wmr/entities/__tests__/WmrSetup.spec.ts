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
    regionalOutputOrgUnits: [],
};

const readyRegional: WmrSetupState = {
    ...readyGlobal,
    flowKind: "regional",
    regionalOutputOrgUnits: [badjia, baoma],
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
        it("lets the user proceed once a level is assigned, whatever the org unit mapping", () => {
            expect(getWmrSetupBlocker(readyRegional)).toBe(undefined);
        });

        it("requires an assigned level", () => {
            expect(getWmrSetupBlocker({ ...readyRegional, regionalOutputOrgUnits: [] })).toEqual({ type: "level" });
        });
    });
});
