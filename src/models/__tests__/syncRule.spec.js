import Instance from "../instance";
import SyncRule from "../syncRule";
import { DataElementModel, IndicatorModel } from "../d2Model";
import { type } from "os";

describe("SyncRule", () => {
    describe("change useDefaultIncludeExclude", () => {
        it("should reset to empty existed exclude include rules if set to true", () => {
            const syncRule = givenASyncRuleWithMetadataIncludeExcludeRules();

            const editedSyncRule = syncRule.markToUseDefaultIncludeExclude();

            expect(editedSyncRule.useDefaultIncludeExclude).toEqual(true);
            expect(editedSyncRule.metadataExcludeIncludeRules).toEqual(undefined);
        });
        it("should assign default exclude include rules in models if set to false", () => {
            const syncRule = givenASyncRuleWithoutMetadataIncludeExcludeRules();

            const editedSyncRule = syncRule.markToNotUseDefaultIncludeExclude([
                DataElementModel,
                IndicatorModel,
            ]);

            expect(editedSyncRule.useDefaultIncludeExclude).toEqual(false);
            expect(editedSyncRule.metadataExcludeIncludeRules).toEqual({
                indicator: {
                    includeRules: [
                        "attributes",
                        "legendSets",
                        "indicatorType",
                        "indicatorGroups",
                        "indicatorGroups.attributes",
                        "indicatorGroups.indicatorGroupSet",
                    ],
                    excludeRules: ["dataSets", "programs"],
                },
                dataElement: {
                    includeRules: [
                        "attributes",
                        "dataSets",
                        "legendSets",
                        "optionSets",
                        "optionSets.options",
                        "categoryCombos",
                        "categoryCombos.attributes",
                        "categoryCombos.categoryOptionCombos",
                        "categoryCombos.categoryOptionCombos.categoryOptions",
                        "categoryCombos.categories",
                        "dataElementGroups",
                        "dataElementGroups.attributes",
                        "dataElementGroups.dataElementGroupSets",
                        "dataElementGroups.dataElementGroupSets.attributes",
                    ],
                    excludeRules: [],
                },
            });
        });
    });
    describe("change metadataId", () => {
        it("should reset to empty exclude include rules if really has changed", () => {
            const syncRule = givenASyncRuleWithMetadataIncludeExcludeRules();

            const editedSyncRule = syncRule.updateMetadataIds(["newId1", "newId2"]);

            expect(editedSyncRule.useDefaultIncludeExclude).toEqual(true);
            expect(editedSyncRule.metadataExcludeIncludeRules).toEqual(undefined);
        });
        it("should not reset exclude include rules if really has not changed", () => {
            const syncRule = givenASyncRuleWithMetadataIncludeExcludeRules();

            const editedSyncRule = syncRule.updateMetadataIds(syncRule.metadataIds);

            expect(editedSyncRule.useDefaultIncludeExclude).toEqual(
                syncRule.useDefaultIncludeExclude
            );
            expect(editedSyncRule.metadataExcludeIncludeRules).toEqual(
                syncRule.metadataExcludeIncludeRules
            );
        });
    });
    describe("moveRuleFromExcludeToInclude", () => {
        it("should remove the rule from exclude and to add the rule to include list if select only one to move", () => {
            const syncRule = givenASyncRuleWithMetadataIncludeExcludeRules();

            const editedSyncRule = syncRule.moveRuleFromExcludeToInclude("organisationUnit", [0]);

            const expectedMetadataIncludeExcludeRules = {
                organisationUnit: {
                    includeRules: ["legendSets", "dataSets", "programs", "users", "attributes"],
                    excludeRules: [
                        "organisationUnitGroups",
                        "organisationUnitGroups.attributes",
                        "organisationUnitGroups.organisationUnitGroupSets",
                        "organisationUnitGroups.organisationUnitGroupSets.attributes",
                    ],
                },
                indicators: {
                    includeRules: ["attributes", "legendSets"],
                    excludeRules: ["dataSets", "programs"],
                },
            };

            expect(editedSyncRule.metadataExcludeIncludeRules).toEqual(
                expectedMetadataIncludeExcludeRules
            );
        });
        it("should remove the rules from exclude and to add the rules to include list if select more of one to move", () => {
            const syncRule = givenASyncRuleWithMetadataIncludeExcludeRules();

            const editedSyncRule = syncRule.moveRuleFromExcludeToInclude("organisationUnit", [
                0,
                1,
            ]);

            const expectedMetadataIncludeExcludeRules = {
                organisationUnit: {
                    includeRules: [
                        "legendSets",
                        "dataSets",
                        "programs",
                        "users",
                        "attributes",
                        "organisationUnitGroups",
                    ],
                    excludeRules: [
                        "organisationUnitGroups.attributes",
                        "organisationUnitGroups.organisationUnitGroupSets",
                        "organisationUnitGroups.organisationUnitGroupSets.attributes",
                    ],
                },
                indicators: {
                    includeRules: ["attributes", "legendSets"],
                    excludeRules: ["dataSets", "programs"],
                },
            };

            expect(editedSyncRule.metadataExcludeIncludeRules).toEqual(
                expectedMetadataIncludeExcludeRules
            );
        });
    });
    describe("moveRuleFromIncludeToExclude", () => {
        it("should remove the rule from include and to add the rule to exclude list if select only one to move", () => {
            const syncRule = givenASyncRuleWithMetadataIncludeExcludeRules();

            const editedSyncRule = syncRule.moveRuleFromIncludeToExclude("organisationUnit", [0]);

            const expectedMetadataIncludeExcludeRules = {
                organisationUnit: {
                    includeRules: ["dataSets", "programs", "users"],
                    excludeRules: [
                        "attributes",
                        "organisationUnitGroups",
                        "organisationUnitGroups.attributes",
                        "organisationUnitGroups.organisationUnitGroupSets",
                        "organisationUnitGroups.organisationUnitGroupSets.attributes",
                        "legendSets",
                    ],
                },
                indicators: {
                    includeRules: ["attributes", "legendSets"],
                    excludeRules: ["dataSets", "programs"],
                },
            };

            expect(editedSyncRule.metadataExcludeIncludeRules).toEqual(
                expectedMetadataIncludeExcludeRules
            );
        });
        it("should remove the rules from include and to add the rules to exclude list if select more of one to move", () => {
            const syncRule = givenASyncRuleWithMetadataIncludeExcludeRules();

            const editedSyncRule = syncRule.moveRuleFromIncludeToExclude("organisationUnit", [
                0,
                1,
            ]);

            const expectedMetadataIncludeExcludeRules = {
                organisationUnit: {
                    includeRules: ["programs", "users"],
                    excludeRules: [
                        "attributes",
                        "organisationUnitGroups",
                        "organisationUnitGroups.attributes",
                        "organisationUnitGroups.organisationUnitGroupSets",
                        "organisationUnitGroups.organisationUnitGroupSets.attributes",
                        "legendSets",
                        "dataSets",
                    ],
                },
                indicators: {
                    includeRules: ["attributes", "legendSets"],
                    excludeRules: ["dataSets", "programs"],
                },
            };

            expect(editedSyncRule.metadataExcludeIncludeRules).toEqual(
                expectedMetadataIncludeExcludeRules
            );
        });
    });
});

function givenASyncRuleWithMetadataIncludeExcludeRules(metadataIncludeExcludeRules) {
    if (!metadataIncludeExcludeRules) {
        metadataIncludeExcludeRules = {
            organisationUnit: {
                includeRules: ["legendSets", "dataSets", "programs", "users"],
                excludeRules: [
                    "attributes",
                    "organisationUnitGroups",
                    "organisationUnitGroups.attributes",
                    "organisationUnitGroups.organisationUnitGroupSets",
                    "organisationUnitGroups.organisationUnitGroupSets.attributes",
                ],
            },
            indicators: {
                includeRules: ["attributes", "legendSets"],
                excludeRules: ["dataSets", "programs"],
            },
        };
    }

    return new SyncRule({
        id: "",
        name: "",
        description: "",
        builder: {
            metadataIncludeExcludeRules: metadataIncludeExcludeRules,
            useDefaultIncludeExclude: false,
            targetInstances: [],
            metadataIds: ["id1", "id2"],
        },
        enabled: false,
    });
}

function givenASyncRuleWithoutMetadataIncludeExcludeRules() {
    return new SyncRule({
        id: "",
        name: "",
        description: "",
        builder: {
            metadataIncludeExcludeRules: undefined,
            useDefaultIncludeExclude: true,
            targetInstances: [],
            metadataIds: ["id1", "id2"],
        },
        enabled: false,
    });
}

export {};
