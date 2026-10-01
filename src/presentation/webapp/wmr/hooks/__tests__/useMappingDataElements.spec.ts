import { describe, expect, it, vi } from "vitest";
import { filterMappedDataElementIds } from "../useMappingDataElements";

vi.hoisted(() => {
    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: { getItem: () => null },
    });
});

describe("filterMappedDataElementIds", () => {
    it("keeps only mapped data elements belonging to the selected data set", () => {
        const mappedDataElementIds = ["dataset-a-de-1", "dataset-b-de-1", "dataset-a-de-2"];
        const selectedDataSetDataElementIds = ["dataset-a-de-1", "dataset-a-de-2"];

        expect(filterMappedDataElementIds(mappedDataElementIds, selectedDataSetDataElementIds)).toEqual([
            "dataset-a-de-1",
            "dataset-a-de-2",
        ]);
    });

    it("returns no IDs when the selected data set has no mapped elements", () => {
        expect(filterMappedDataElementIds(["dataset-a-de-1"], ["dataset-b-de-1"])).toEqual([]);
    });
});
