import { getChildrenIds } from "../utils";

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
});
