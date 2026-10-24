import { describe, expect, it } from "vitest";
import { MetadataMappingDictionary } from "../../../../mapping/entities/MetadataMapping";
import {
    buildWmrLevelAssignment,
    getAssignableLevels,
    getParentOrgUnits,
    getSingleLevel,
    isOrgUnitMapped,
    WmrLevelOrgUnit,
} from "../WmrOrgUnits";

const sierraLeone = "ImspTQPwCqd";
const bo = "O6uvpzGd5pu";
const badjia = "YuQRtpLP10I";
const baoma = "vWbkYPRmKyS";
const bumpe = "BGGmAwx33dj";
const targetBadjia = "tgtBadjia01";

function orgUnit(id: string, level: number, path: string): WmrLevelOrgUnit {
    return { id, name: `${id} name`, level, path };
}

const badjiaOrgUnit = orgUnit(badjia, 3, `/${sierraLeone}/${bo}/${badjia}`);
const baomaOrgUnit = orgUnit(baoma, 3, `/${sierraLeone}/${bo}/${baoma}`);
const ngelehun = orgUnit("DiszpKrYNg8", 4, `/${sierraLeone}/${bo}/${badjia}/DiszpKrYNg8`);
const njandama = orgUnit("g8upMTyEZGZ", 4, `/${sierraLeone}/${bo}/${badjia}/g8upMTyEZGZ`);

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

    describe("getAssignableLevels", () => {
        it("keeps level 3 and deeper, since level 2 would sum into the country", () => {
            const levels = [1, 2, 3, 4].map(level => ({ level, name: `Level ${level}`, count: level }));

            expect(getAssignableLevels(levels)).toEqual([
                { level: 3, name: "Level 3", count: 3 },
                { level: 4, name: "Level 4", count: 4 },
            ]);
        });
    });

    describe("getSingleLevel", () => {
        it("returns the level shared by every org unit", () => {
            expect(getSingleLevel([ngelehun, njandama])).toBe(4);
        });

        it("returns nothing for org units of several levels or no org units", () => {
            expect([getSingleLevel([ngelehun, badjiaOrgUnit]), getSingleLevel([])]).toEqual([undefined, undefined]);
        });
    });

    describe("buildWmrLevelAssignment", () => {
        it("takes the parents with their names from the org units of the level above", () => {
            expect(buildWmrLevelAssignment(4, [ngelehun, njandama], [baomaOrgUnit, badjiaOrgUnit])).toEqual({
                level: 4,
                orgUnits: [ngelehun, njandama],
                parents: [badjiaOrgUnit],
            });
        });
    });

    describe("isOrgUnitMapped", () => {
        it("is true only for org units mapped to a target other than DISABLED", () => {
            const mapping = { ...mappedTo({ [badjia]: targetBadjia, [baoma]: "DISABLED" }), [bumpe]: {} };

            expect([badjia, baoma, bumpe, "unknownOrgU"].map(id => isOrgUnitMapped(mapping, id))).toEqual([
                true,
                false,
                false,
                false,
            ]);
        });
    });
});
