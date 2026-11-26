import { instance, mock, when } from "ts-mockito";
import { vi } from "vitest";
import { DynamicRepositoryFactory } from "../../../common/factories/DynamicRepositoryFactory";
import { Instance } from "../../../instance/entities/Instance";
import { SynchronizationRule } from "../../entities/SynchronizationRule";
import { RulesRepository } from "../../repositories/RulesRepository";
import { ListSyncRuleUseCase, ListSyncRuleUseCaseParams } from "../ListSyncRuleUseCase";

vi.mock("../../../../utils/permissions", () => ({
    isGlobalAdmin: async () => false,
    getUserInfo: async () => ({ id: "reader", name: "Reader", username: "reader", userGroups: [] }),
}));

describe("ListSyncRuleUseCase scheduler filtering", () => {
    const localInstance = Instance.build({
        id: "local",
        name: "Local",
        type: "local",
        url: "http://localhost:8080",
    });
    const mdSyncWithSchedulingEnabled = SynchronizationRule.create().update({ id: "scheduling-enabled-mdsync", enabled: true });
    const dhis2WithSchedulingEnabled = mdSyncWithSchedulingEnabled.update({
        id: "scheduling-enabled-dhis2",
        useAggregatedDataExchangeDhis2Job: true,
    });
    const legacyWithSchedulingEnabled = mdSyncWithSchedulingEnabled.update({
        id: "scheduling-enabled-legacy",
        useAggregatedDataExchangeDhis2Job: undefined,
    });
    const mdSyncWithSchedulingDisabled = mdSyncWithSchedulingEnabled.update({ id: "scheduling-disabled-mdsync", enabled: false });
    const dhis2WithSchedulingDisabled = dhis2WithSchedulingEnabled.update({ id: "scheduling-disabled-dhis2", enabled: false });
    const hidden = mdSyncWithSchedulingEnabled.update({ id: "hidden", publicAccess: "--------" });

    const cases: { name: string; filters: ListSyncRuleUseCaseParams["filters"]; expected: string[] }[] = [
        {
            name: "lists visible rules when no scheduler filter is supplied",
            filters: {},
            expected: [
                "scheduling-disabled-dhis2",
                "scheduling-disabled-mdsync",
                "scheduling-enabled-dhis2",
                "scheduling-enabled-legacy",
                "scheduling-enabled-mdsync",
            ],
        },
        {
            name: "ignores the scheduler type when no schedule-enabled filter is supplied",
            filters: { schedulerTypeFilter: "dhis2" },
            expected: [
                "scheduling-disabled-dhis2",
                "scheduling-disabled-mdsync",
                "scheduling-enabled-dhis2",
                "scheduling-enabled-legacy",
                "scheduling-enabled-mdsync",
            ],
        },
        {
            name: "lists rules with scheduling enabled across scheduler types when no type is requested",
            filters: { schedulerEnabledFilter: "enabled" },
            expected: ["scheduling-enabled-dhis2", "scheduling-enabled-legacy", "scheduling-enabled-mdsync"],
        },
        {
            name: "lists only delegated rules with scheduling enabled when DHIS2 is requested",
            filters: { schedulerEnabledFilter: "enabled", schedulerTypeFilter: "dhis2" },
            expected: ["scheduling-enabled-dhis2"],
        },
        {
            name: "currently includes delegated rules when MDSync rules with scheduling enabled are requested",
            filters: { schedulerEnabledFilter: "enabled", schedulerTypeFilter: "metadataSync" },
            expected: ["scheduling-enabled-dhis2", "scheduling-enabled-legacy", "scheduling-enabled-mdsync"],
        },
        {
            name: "lists only delegated rules with scheduling disabled when DHIS2 is requested",
            filters: { schedulerEnabledFilter: "disabled", schedulerTypeFilter: "dhis2" },
            expected: ["scheduling-disabled-dhis2"],
        },
        {
            name: "currently includes delegated rules when MDSync rules with scheduling disabled are requested",
            filters: { schedulerEnabledFilter: "disabled", schedulerTypeFilter: "metadataSync" },
            expected: ["scheduling-disabled-dhis2", "scheduling-disabled-mdsync"],
        },
    ];

    it.each(cases)("$name", async ({ filters, expected }) => {
        const useCase = givenAListSyncRuleUseCaseWithRules([
            mdSyncWithSchedulingEnabled,
            dhis2WithSchedulingEnabled,
            legacyWithSchedulingEnabled,
            mdSyncWithSchedulingDisabled,
            dhis2WithSchedulingDisabled,
            hidden,
        ]);

        const result = await useCase.execute({ filters });

        expect(result.rows.map(rule => rule.id)).toEqual(expected);
    });

    function givenAListSyncRuleUseCaseWithRules(rules: SynchronizationRule[]): ListSyncRuleUseCase {
        const repository = mock<RulesRepository>();
        when(repository.list(false)).thenResolve(rules);

        const factory = mock<DynamicRepositoryFactory>();
        when(factory.rulesRepository(localInstance)).thenReturn(instance(repository));

        return new ListSyncRuleUseCase(instance(factory), localInstance);
    }
});
