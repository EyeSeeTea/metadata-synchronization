import _ from "lodash";
import { describe, expect, it } from "vitest";
import { D2Model } from "../default";
import { modelByMappingType, modelFactory } from "../factory";
import * as mappingClasses from "../mapping";
import * as metadataClasses from "../metadata";

const isModel = (value: unknown): value is typeof D2Model => typeof value === "function" && "getMappingType" in value;

const toModels = (classes: object): Array<typeof D2Model> => Object.values(classes).filter(isModel);

const findRepeated = (values: Array<string | undefined>) =>
    _(values)
        .compact()
        .countBy()
        .pickBy(count => count > 1)
        .keys()
        .value();

const allModels = [...toModels(metadataClasses), ...toModels(mappingClasses)];

const sharedMappingTypes = findRepeated(allModels.map(model => model.getMappingType()));

describe("modelFactory", () => {
    it.each(sharedMappingTypes)("has an explicit destination model for shared mapping type %s", mappingType => {
        expect(modelByMappingType[mappingType]).toBeDefined();
    });

    it.each(_.toPairs(modelByMappingType))("resolves mapping type %s to its mapped model", (mappingType, model) => {
        expect(model?.getMappingType()).toBe(mappingType);
        expect(modelFactory(mappingType)).toBe(model);
    });

    it("has no repeated metadataType in metadata models", () => {
        expect(findRepeated(toModels(metadataClasses).map(model => model.getMetadataType()))).toEqual([]);
    });

    it("has no repeated collectionName in metadata models", () => {
        expect(findRepeated(toModels(metadataClasses).map(model => model.getCollectionName()))).toEqual([]);
    });
});
