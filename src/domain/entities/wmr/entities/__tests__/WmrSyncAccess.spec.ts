import { describe, expect, it } from "vitest";
import { getWmrSyncAccess, WmrSyncAccessInfo } from "../WmrSyncAccess";

const sierraLeone = "ImspTQPwCqd";
const bo = "O6uvpzGd5pu";
const bombali = "fdc6uOvgoji";
const countrySyncName = "MAL - WMR Form - Country Sync";

const badjia = { id: "YuQRtpLP10I", name: "Badjia", path: `/${sierraLeone}/${bo}/YuQRtpLP10I` };
const biriwa = { id: "fwH9ipvXde9", name: "Biriwa", path: `/${sierraLeone}/${bombali}/fwH9ipvXde9` };
const sella = { id: "e2RFjxcxSyI", name: "Sella Limba", path: `/${sierraLeone}/${bombali}/e2RFjxcxSyI` };

function givenInfo(canWriteData: boolean, captureOrgUnitIds: ReadonlyArray<string>): WmrSyncAccessInfo {
    return { dataSet: { name: countrySyncName, canWriteData }, captureOrgUnitIds };
}

describe("getWmrSyncAccess", () => {
    it("allows the sync when the user writes data and captures an ancestor of every destination", () => {
        expect(getWmrSyncAccess(givenInfo(true, [sierraLeone]), [badjia, biriwa])).toEqual({ type: "ok" });
    });

    it("allows the sync when the destination itself is a capture org unit", () => {
        expect(getWmrSyncAccess(givenInfo(true, [badjia.id]), [badjia])).toEqual({ type: "ok" });
    });

    it("rejects a user without data write sharing on the Country Sync", () => {
        expect(getWmrSyncAccess(givenInfo(false, [sierraLeone]), [badjia])).toEqual({
            type: "noDataWrite",
            dataSet: countrySyncName,
        });
    });

    it("lists the destinations outside the capture org units of the user", () => {
        expect(getWmrSyncAccess(givenInfo(true, [bo]), [badjia, biriwa, sella])).toEqual({
            type: "outsideCapture",
            orgUnitNames: ["Biriwa", "Sella Limba"],
        });
    });

    it("reports the missing data write sharing before the org units outside capture", () => {
        expect(getWmrSyncAccess(givenInfo(false, [bo]), [biriwa])).toEqual({
            type: "noDataWrite",
            dataSet: countrySyncName,
        });
    });
});
