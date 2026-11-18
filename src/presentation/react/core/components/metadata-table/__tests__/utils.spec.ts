import { getChildrenIds, getCurrentTypeIds } from "../utils";

const dataStores = [
    {
        id: "namespace1[NS]",
        keys: [
            { id: "namespace1[NS]key1", displayName: "key1" },
            { id: "namespace1[NS]key2", displayName: "key2" },
        ],
    },
    { id: "namespace2[NS]", keys: [] },
];

const dataElementGroupSets = [
    {
        id: "groupSet1",
        dataElementGroups: [{ id: "group1", dataElements: [{ id: "dataElement1" }, { id: "dataElement2" }] }],
    },
];

const trackerProgramRows = [
    {
        id: "program1",
        stages: [{ id: "program1-stage1", dataElements: [{ id: "program1-stage1-dataElement1" }] }],
    },
];

describe("getChildrenIds", () => {
    it("returns the ids of the children under the given keys", () => {
        expect(getChildrenIds(dataStores, ["keys"])).toEqual(["namespace1[NS]key1", "namespace1[NS]key2"]);
    });

    it("returns no ids when no children keys are given", () => {
        expect(getChildrenIds(dataStores, [])).toEqual([]);
    });

    it("ignores objects that do not have the children key", () => {
        expect(getChildrenIds([{ id: "dataElement1" }], ["keys"])).toEqual([]);
    });

    it("returns the children of every level", () => {
        expect(getChildrenIds(dataElementGroupSets, ["dataElements", "dataElementGroups"])).toEqual([
            "group1",
            "dataElement1",
            "dataElement2",
        ]);
    });
});

describe("getCurrentTypeIds", () => {
    const programRows = [
        {
            id: "program1",
            dataElements: [{ id: "program1-stage1-dataElement1" }, { id: "program1-stage1-dataElement2" }],
        },
    ];

    it("adds the ids of the children in the loaded rows", () => {
        expect(getCurrentTypeIds(["program1", "program2"], programRows, ["dataElements"])).toEqual([
            "program1",
            "program2",
            "program1-stage1-dataElement1",
            "program1-stage1-dataElement2",
        ]);
    });

    it("does not repeat ids that the id list already has", () => {
        expect(getCurrentTypeIds(["namespace1[NS]", "namespace1[NS]key1"], dataStores, ["keys"])).toEqual([
            "namespace1[NS]",
            "namespace1[NS]key1",
            "namespace1[NS]key2",
        ]);
    });

    it("adds the ids of children two levels down", () => {
        expect(getCurrentTypeIds(["groupSet1"], dataElementGroupSets, ["dataElements", "dataElementGroups"])).toEqual([
            "groupSet1",
            "group1",
            "dataElement1",
            "dataElement2",
        ]);

        expect(
            getCurrentTypeIds(["program1"], trackerProgramRows, ["dataElements", "programIndicators", "stages"])
        ).toEqual(["program1", "program1-stage1", "program1-stage1-dataElement1"]);
    });

    it("returns the id list unchanged when no children keys are given", () => {
        expect(getCurrentTypeIds(["program1"], programRows, [])).toEqual(["program1"]);
    });
});
