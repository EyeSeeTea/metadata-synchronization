import { describe, expect, it, vi } from "vitest";
import { DataSetAttrs, WmrSettings } from "../../../../../domain/entities/wmr/entities/WmrSettings";
import { filterMappedDataElementIds, getWmrSyncIds } from "../useMappingDataElements";

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

describe("getWmrSyncIds", () => {
    const sourceDataElementIds = ["source-de-1", "source-de-2"];
    const sourceIndicatorIds = ["source-ind-1", "source-ind-2"];
    const otherDataElementId = "other-de-1";
    const otherIndicatorId = "other-ind-1";

    const toRefs = (ids: ReadonlyArray<string>) => ids.map(id => ({ id, name: id }));

    const dataSet = (
        id: string,
        dataElementIds: ReadonlyArray<string>,
        indicatorIds: ReadonlyArray<string>
    ): DataSetAttrs => ({
        id,
        name: id,
        periodType: "Yearly",
        dataElements: toRefs(dataElementIds),
        indicators: toRefs(indicatorIds),
        orgUnits: [],
    });

    const settings = new WmrSettings({
        dataSets: [
            dataSet("source", sourceDataElementIds, sourceIndicatorIds),
            dataSet("other", [otherDataElementId], [otherIndicatorId]),
        ],
        destination: undefined,
        countryOrgUnit: { id: "ImspTQPwCqd", name: "Sierra Leone", path: "/ImspTQPwCqd" },
    });

    it("syncs the mapped data elements and indicators of the source and reports the mapped indicators", () => {
        expect(getWmrSyncIds(settings, "source", ["source-de-1", "source-ind-2"])).toEqual({
            metadataIds: ["source-de-1", "source-ind-2"],
            mappedIndicatorIds: ["source-ind-2"],
        });
    });

    it("reports no mapped indicators when only data elements are mapped", () => {
        expect(getWmrSyncIds(settings, "source", sourceDataElementIds)).toEqual({
            metadataIds: sourceDataElementIds,
            mappedIndicatorIds: [],
        });
    });

    it("excludes the unmapped data elements and indicators of the source", () => {
        expect(getWmrSyncIds(settings, "source", ["source-de-2"])).toEqual({
            metadataIds: ["source-de-2"],
            mappedIndicatorIds: [],
        });
    });

    it("excludes the mapped ids of other data sets", () => {
        expect(getWmrSyncIds(settings, "source", [otherDataElementId, otherIndicatorId, "source-ind-1"])).toEqual({
            metadataIds: ["source-ind-1"],
            mappedIndicatorIds: ["source-ind-1"],
        });
    });
});
