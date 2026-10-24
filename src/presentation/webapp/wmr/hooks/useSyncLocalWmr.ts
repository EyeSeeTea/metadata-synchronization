import _ from "lodash";
import { useLoading } from "@eyeseetea/d2-ui-components";
import React from "react";
import { SynchronizationReport } from "../../../../domain/reports/entities/SynchronizationReport";
import { SynchronizationResult } from "../../../../domain/reports/entities/SynchronizationResult";
import { useAppContext } from "../../../react/core/contexts/AppContext";
import { useWmrContext } from "../context/WmrContext";
import i18n from "../../../../utils/i18n";
import {
    getWmrMonthRangeDates,
    getWmrReportedYear,
    WmrMonthRange,
} from "../../../../domain/entities/wmr/entities/WmrSyncFlow";
import {
    getWmrDestinationOrgUnits,
    isWmrAggregationEnabled,
    WmrFlowDefinition,
    wmrFlowDefinitions,
} from "../../../../domain/entities/wmr/entities/WmrFlowKind";
import { SynchronizationRule } from "../../../../domain/rules/entities/SynchronizationRule";
import { getWmrSyncIds, useMappingDataElements, WmrSyncIds } from "./useMappingDataElements";

export type WmrLocalSyncResult = Readonly<{
    type: "success" | "info" | "warning" | "error";
    message: string;
}>;

export function summarizeWmrLocalSync(report?: SynchronizationReport): WmrLocalSyncResult {
    if (!report) {
        return { type: "error", message: i18n.t("Synchronization did not return a report.") };
    }

    const results = report.getResults();
    const failedResult = results.find(
        (result: SynchronizationResult) =>
            result.status === "ERROR" || result.status === "NETWORK ERROR" || !!result.errors?.length
    );
    if (report.status === "FAILURE" || failedResult) {
        const conflicts = _.uniq(failedResult?.errors?.map(({ message }) => message));
        return {
            type: "error",
            message:
                conflicts.length > 0 ? conflicts.join(" ") : failedResult?.message ?? i18n.t("Synchronization failed."),
        };
    }

    const { imported, updated, ignored } = results.reduce(
        (totals, { stats }) => ({
            imported: totals.imported + (stats?.imported ?? 0),
            updated: totals.updated + (stats?.updated ?? 0),
            ignored: totals.ignored + (stats?.ignored ?? 0),
        }),
        { imported: 0, updated: 0, ignored: 0 }
    );

    if (imported + updated > 0) {
        return {
            type: "success",
            message: i18n.t("{{imported}} created, {{updated}} updated, {{ignored}} unchanged", {
                imported,
                updated,
                ignored,
            }),
        };
    }
    if (ignored > 0) {
        return { type: "info", message: i18n.t("The {{ignored}} values were already up to date", { ignored }) };
    }
    return {
        type: "warning",
        message: i18n.t("There are no values for the mapped data elements in the period"),
    };
}

export async function syncWithDryRun(
    synchronize: (dryRun: boolean) => Promise<SynchronizationReport | undefined>
): Promise<WmrLocalSyncResult> {
    const dryRunResult = summarizeWmrLocalSync(await synchronize(true));
    return dryRunResult.type === "error" ? dryRunResult : summarizeWmrLocalSync(await synchronize(false));
}

export type WmrLocalSyncRuleParams = Readonly<{
    definition: WmrFlowDefinition;
    syncIds: WmrSyncIds;
    orgUnitPaths: ReadonlyArray<string>;
    monthRange: WmrMonthRange;
}>;

export function buildWmrLocalSyncRule(rule: SynchronizationRule, params: WmrLocalSyncRuleParams): SynchronizationRule {
    const { definition, syncIds, orgUnitPaths, monthRange } = params;
    const enableAggregation = isWmrAggregationEnabled(definition, syncIds.mappedIndicatorIds);
    const ruleWithIds = rule
        .updateBuilder({ metadataIds: syncIds.metadataIds })
        .updateDataSyncEnableAggregation(enableAggregation)
        .updateDataSyncAggregationType(enableAggregation ? definition.aggregationType : undefined)
        .updateDataSyncOrgUnitPaths([...orgUnitPaths]);

    if (!definition.sumIntoYear) return ruleWithIds;

    const { startDate, endDate } = getWmrMonthRangeDates(monthRange);
    return ruleWithIds.updateDataSyncPeriod("FIXED").updateDataSyncStartDate(startDate).updateDataSyncEndDate(endDate);
}

export function useSyncLocalWmr() {
    const { compositionRoot } = useAppContext();
    const { settings, syncRule, regionalParents, regionalMonthRange } = useWmrContext();
    const { dataElementsToMigrate } = useMappingDataElements("LOCAL");
    const loading = useLoading();
    const [wmrLocalSyncResult, setWmrLocalSyncResult] = React.useState<WmrLocalSyncResult | null>(null);

    const flowKind = syncRule?.flow?.kind;
    const definition = flowKind ? wmrFlowDefinitions[flowKind] : undefined;
    const localDataSetId = syncRule?.localDataSetId;

    const syncIds = React.useMemo(
        () => (settings ? getWmrSyncIds(settings, localDataSetId, dataElementsToMigrate) : undefined),
        [settings, localDataSetId, dataElementsToMigrate]
    );

    const destinationOrgUnits = React.useMemo(
        () =>
            settings && definition
                ? getWmrDestinationOrgUnits(definition, settings.countryOrgUnit, regionalParents)
                : [],
        [settings, definition, regionalParents]
    );

    const readsAnalytics = Boolean(
        definition && syncIds && isWmrAggregationEnabled(definition, syncIds.mappedIndicatorIds)
    );

    const syncLocalWmr = React.useCallback(async () => {
        if (!syncIds || !definition || !syncRule?.flow) {
            throw new Error("WMR settings, sync rule or flow not found");
        }

        if (!syncIds.metadataIds.length) {
            setWmrLocalSyncResult({
                type: "error",
                message: i18n.t("No mapped data elements found for the selected data set."),
            });
            return;
        }

        const { destination } = syncRule.flow;
        const syncRuleUpdated = buildWmrLocalSyncRule(syncRule.rule, {
            definition,
            syncIds,
            orgUnitPaths: destinationOrgUnits.map(({ path }) => path),
            monthRange: regionalMonthRange,
        });

        const year = getWmrReportedYear(syncRuleUpdated.dataParams);

        loading.show();
        const result = await compositionRoot.sync.prepare(syncRuleUpdated.type, syncRuleUpdated.toBuilder());

        const synchronize = async (dryRun: boolean) => {
            const sync = compositionRoot.wmr.syncDataset(
                syncRuleUpdated.updateBuilderDataParams({ dryRun }).toBuilder()
            );
            for await (const { message, syncReport, done } of sync.execute({
                periods: [year],
                targetPeriod: definition.sumIntoYear ? year : undefined,
                targetDataSetId: destination.id,
            })) {
                if (message) loading.show(true, message);
                if (syncReport && !dryRun) await compositionRoot.reports.save(syncReport);
                if (done) return syncReport;
            }
        };

        await result.match({
            success: async () => {
                const localSyncResult = await syncWithDryRun(synchronize);
                loading.hide();
                if (localSyncResult.type !== "error") syncRule.rule = syncRuleUpdated;
                setWmrLocalSyncResult(localSyncResult);
            },
            error: async code => {
                loading.hide();
                setWmrLocalSyncResult({
                    type: "error",
                    message: `${i18n.t("Failed to prepare synchronization rule")}: ${code}`,
                });
            },
        });
    }, [
        compositionRoot.reports,
        compositionRoot.sync,
        compositionRoot.wmr,
        definition,
        destinationOrgUnits,
        loading,
        regionalMonthRange,
        syncIds,
        syncRule,
    ]);

    return {
        syncLocalWmr,
        wmrLocalSyncIsLoading: loading.isLoading,
        wmrLocalSyncResult,
        readsAnalytics,
        destinationOrgUnits,
    };
}
