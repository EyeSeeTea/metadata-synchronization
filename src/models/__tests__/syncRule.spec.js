import Instance from "../instance";
import SyncRule from "../syncRule";

describe("SyncRule", () => {
    describe("change metadataId", () => {
        it("should reset exclude include rules if really has changed", () => {
            const syncRule = givenASyncRuleWithMetadataIncludeExcludeRules();

            const editedSyncRule = syncRule.updateMetadataIds(["newId1", "newId2"]);

            expect(editedSyncRule.useDefaultIncludeExclude).toEqual(true);
            expect(editedSyncRule.metadataExcludeIncludeRules).toEqual(undefined);
        });
        it("should not reset exclude include rules if really has not changed", () => {
            const syncRule = givenASyncRuleWithMetadataIncludeExcludeRules();

            const editedSyncRule = syncRule.updateMetadataIds(syncRule.metadataIds);

            expect(editedSyncRule.useDefaultIncludeExclude).toEqual(syncRule.useDefaultIncludeExclude);
            expect(editedSyncRule.metadataExcludeIncludeRules).toEqual(syncRule.metadataExcludeIncludeRules);
        });
    });
});

function givenASyncRuleWithMetadataIncludeExcludeRules() {
    return new SyncRule({
        id: "",
        name: "",
        description: "",
        builder: {
            metadataIncludeExcludeRules: {
                dataElements: {
                    includeRules: ["attributtes", "legendSets"],
                    excludeRules: ["categoryCombos"],
                },
                indicators: {
                    includeRules: ["attributes", "legendSets"],
                    excludeRules: ["dataSets", "programs"],
                },
            },
            useDefaultIncludeExclude: false,
            targetInstances: [],
            metadataIds: ["id1", "id2"],
        },
        enabled: false,
    });
}

export {};
