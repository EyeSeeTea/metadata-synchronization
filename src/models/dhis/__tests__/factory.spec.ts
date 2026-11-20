import { describe, expect, it } from "vitest";
import { modelFactory } from "../factory";
import {
    AggregatedDataElementModel,
    CategoryOptionMappedModel,
    DataElementFromTEIMappedModel,
    ProgramDataElementModel,
} from "../mapping";

describe("modelFactory", () => {
    it("resolves a shared mapping type to the model that lists its destination items", () => {
        expect(modelFactory("aggregatedDataElements")).toBe(AggregatedDataElementModel);
    });

    it.each([
        ["categoryOptions", CategoryOptionMappedModel],
        ["programDataElements", ProgramDataElementModel],
        ["trackedEntityAttributesToDE", DataElementFromTEIMappedModel],
    ])("keeps the first model with mapping type %s", (mappingType, expectedModel) => {
        expect(modelFactory(mappingType)).toBe(expectedModel);
    });
});
