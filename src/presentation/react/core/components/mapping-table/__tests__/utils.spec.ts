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
        expect(getDestinationModel(GlobalCategoryOptionModel)).toBe(GlobalCategoryOptionModel);
    });

    it.each([
        ["indicators", IndicatorMappedModel],
        ["program indicators", ProgramIndicatorMappedModel],
        ["aggregated data elements", AggregatedDataElementModel],
        ["nested category options", CategoryOptionMappedModel],
    ])("leaves the model to the mapping type for %s", (_name, sourceModel) => {
        expect(getDestinationModel(sourceModel)).toBeUndefined();
    });

    it("leaves the model to the mapping type when there is no source model", () => {
        expect(getDestinationModel(undefined)).toBeUndefined();
    });
});
