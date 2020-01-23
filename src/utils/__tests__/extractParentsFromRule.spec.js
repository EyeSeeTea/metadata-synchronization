import { extractParentsFromRule } from "../extractParentsFromRule";

describe("extractParentsFromRule", () => {
    it("should return empty array if does not exist parent", () => {
        const rule = "organisationUnitGroups";
        const expectedParents = [];
        expect(extractParentsFromRule(rule)).toEqual(expectedParents);
    });
    it("should return a parent if rule has one parent", () => {
        const rule = "organisationUnitGroups.organisationUnitGroupSets";
        const expectedParents = ["organisationUnitGroups"];

        expect(extractParentsFromRule(rule)).toEqual(expectedParents);
    });
    it("should return parents if rule has parents", () => {
        const rule = "organisationUnitGroups.organisationUnitGroupSets.attributes";
        const expectedParents = [
            "organisationUnitGroups.organisationUnitGroupSets",
            "organisationUnitGroups",
        ];

        expect(extractParentsFromRule(rule)).toEqual(expectedParents);
    });
});

export {};
