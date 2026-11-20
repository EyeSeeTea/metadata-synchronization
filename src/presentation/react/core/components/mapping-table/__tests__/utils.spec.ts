import { describe, expect, it } from "vitest";
import {
    AggregatedDataElementModel,
    CategoryOptionMappedModel,
    GlobalCategoryOptionModel,
    IndicatorMappedModel,
    ProgramIndicatorMappedModel,
} from "../../../../../../models/dhis/mapping";
import { getDestinationModel } from "../utils";

describe("getDestinationModel", () => {
    it("reuses the source model for global mapping", () => {
        expect(getDestinationModel(GlobalCategoryOptionModel, "categoryOptions")).toBe(GlobalCategoryOptionModel);
    });

    it.each([
        ["indicators", IndicatorMappedModel, AggregatedDataElementModel],
        ["program indicators", ProgramIndicatorMappedModel, AggregatedDataElementModel],
        ["aggregated data elements", AggregatedDataElementModel, AggregatedDataElementModel],
        ["nested category options", CategoryOptionMappedModel, CategoryOptionMappedModel],
    ])("resolves %s from the mapping type", (_name, sourceModel, expectedModel) => {
        expect(getDestinationModel(sourceModel, sourceModel.getMappingType() ?? "")).toBe(expectedModel);
    });

    it("resolves from the mapping type when there is no source model", () => {
        expect(getDestinationModel(undefined, "aggregatedDataElements")).toBe(AggregatedDataElementModel);
    });
});
