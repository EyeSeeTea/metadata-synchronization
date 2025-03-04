import { modelFactory } from "../dhis/factory";
import { DataElementGroupModel } from "../dhis/metadata";
import { describe, expect, it } from "vitest";

describe("d2ModelFactory", () => {
    describe("d2ModelFactory should return specific model", () => {
        it("DataElementGroup", async () => {
            const d2Model = modelFactory("dataElementGroups");
            expect(d2Model).toEqual(DataElementGroupModel);
        });
    });
});

export {};
