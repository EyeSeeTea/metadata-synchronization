import { describe, expect, it } from "vitest";
import { MetadataMappingDictionary } from "../../../../mapping/entities/MetadataMapping";
import { findDuplicatedTargets, getParentOrgUnits } from "../WmrOrgUnits";

const sierraLeone = "ImspTQPwCqd";
const bo = "O6uvpzGd5pu";
const badjia = "YuQRtpLP10I";
const baoma = "vWbkYPRmKyS";
const bumpe = "BGGmAwx33dj";
const targetBadjia = "tgtBadjia01";
const targetBaoma = "tgtBaoma001";

function mappedTo(entries: Readonly<Record<string, string>>): MetadataMappingDictionary["organisationUnits"] {
    return Object.fromEntries(Object.entries(entries).map(([id, mappedId]) => [id, { mappedId }]));
}

describe("WmrOrgUnits", () => {
    describe("getParentOrgUnits", () => {
        it("returns the unique parents of the Bo facilities in order of appearance", () => {
            const facilities = [
                { id: "DiszpKrYNg8", path: `/${sierraLeone}/${bo}/${badjia}/DiszpKrYNg8` },
                { id: "g8upMTyEZGZ", path: `/${sierraLeone}/${bo}/${badjia}/g8upMTyEZGZ` },
                { id: "jNb63DIHuwU", path: `/${sierraLeone}/${bo}/${baoma}/jNb63DIHuwU` },
                { id: "WAjjFMDJKcx", path: `/${sierraLeone}/${bo}/${baoma}/WAjjFMDJKcx` },
            ];

            expect(getParentOrgUnits(facilities)).toEqual([
                { id: badjia, path: `/${sierraLeone}/${bo}/${badjia}` },
                { id: baoma, path: `/${sierraLeone}/${bo}/${baoma}` },
            ]);
        });

        it("skips the root, which has no parent", () => {
            expect(getParentOrgUnits([{ id: sierraLeone, path: `/${sierraLeone}` }])).toEqual([]);
        });
    });

    describe("findDuplicatedTargets", () => {
        it("reports two parents mapped to the same target", () => {
            const mapping = mappedTo({ [badjia]: targetBadjia, [baoma]: targetBadjia });

            expect(findDuplicatedTargets(mapping, [badjia, baoma])).toEqual([
                { targetId: targetBadjia, orgUnitIds: [badjia, baoma] },
            ]);
        });

        it("reports nothing when every parent has its own target", () => {
            const mapping = mappedTo({ [badjia]: targetBadjia, [baoma]: targetBaoma });

            expect(findDuplicatedTargets(mapping, [badjia, baoma])).toEqual([]);
        });

        it("ignores unmapped parents and org units outside the given ids", () => {
            const mapping = { ...mappedTo({ [badjia]: targetBadjia, [bumpe]: targetBadjia }), [baoma]: {} };

            expect(findDuplicatedTargets(mapping, [badjia, baoma, "unknownOrgU"])).toEqual([]);
        });

        it("reports nothing without a mapping", () => {
            expect(findDuplicatedTargets(undefined, [badjia, baoma])).toEqual([]);
        });
    });
});
