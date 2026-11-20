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
    getWmrRangeMonths,
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
        .updateDataSyncOrgUnitPaths([...orgUnitPaths])
        .updateBuilderDataParams({ runAnalyticsBefore: false, runAnalyticsAfter: false });

    if (definition.sourcePeriodType !== "Monthly") return ruleWithIds;

    const { startDate, endDate } = getWmrMonthRangeDates(monthRange);
    return ruleWithIds.updateDataSyncPeriod("FIXED").updateDataSyncStartDate(startDate).updateDataSyncEndDate(endDate);
}

export function useSyncLocalWmr() {
    const { compositionRoot } = useAppContext();
    const { settings, syncRule, regionalOutputOrgUnits, regionalMonthRange, setRegionalPrepared } = useWmrContext();
    const { dataElementsToMigrate } = useMappingDataElements("LOCAL");
    const loading = useLoading();
    const [wmrLocalSyncResult, setWmrLocalSyncResult] = React.useState<WmrLocalSyncResult | null>(null);
    const mountedRef = React.useRef(false);
    const latestRequestRef = React.useRef(0);

    React.useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

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
                ? getWmrDestinationOrgUnits(definition, settings.countryOrgUnit, regionalOutputOrgUnits)
                : [],
        [settings, definition, regionalOutputOrgUnits]
    );

    const readsAnalytics = Boolean(
        definition && syncIds && isWmrAggregationEnabled(definition, syncIds.mappedIndicatorIds)
    );
    const preparationInputKey = JSON.stringify({
        flowKind,
        localDataSetId,
        metadataIds: syncIds?.metadataIds,
        mappedIndicatorIds: syncIds?.mappedIndicatorIds,
        destinationOrgUnitPaths: destinationOrgUnits.map(({ path }) => path),
        monthRange: regionalMonthRange,
    });
    const currentInputKeyRef = React.useRef(preparationInputKey);
    currentInputKeyRef.current = preparationInputKey;

    const syncLocalWmr = React.useCallback(async () => {
        const requestId = ++latestRequestRef.current;
        const requestInputKey = preparationInputKey;
        const isRegional = flowKind === "regional";
        if (isRegional) setRegionalPrepared(false);

        const isCurrentRequest = () =>
            mountedRef.current &&
            requestId === latestRequestRef.current &&
            currentInputKeyRef.current === requestInputKey;

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
        const periods = definition.sourcePeriodType === "Monthly" ? getWmrRangeMonths(regionalMonthRange) : [year];

        loading.show();
        try {
            const result = await compositionRoot.sync.prepare(syncRuleUpdated.type, syncRuleUpdated.toBuilder());

            const synchronize = async (dryRun: boolean) => {
                const sync = compositionRoot.wmr.syncDataset(
                    syncRuleUpdated.updateBuilderDataParams({ dryRun }).toBuilder()
                );
                for await (const { message, syncReport, done } of sync.execute({
                    periods,
                    targetDataSetId: destination.id,
                })) {
                    if (message) loading.show(true, message);
                    if (syncReport && !dryRun) await compositionRoot.reports.save(syncReport);
                    if (done) return syncReport;
                }
                return undefined;
            };

            await result.match({
                success: async () => {
                    if (!isCurrentRequest()) return;
                    const localSyncResult = await syncWithDryRun(synchronize);
                    if (localSyncResult.type !== "error") {
                        if (isCurrentRequest()) syncRule.rule = syncRuleUpdated;
                        if (flowKind === "regional" && localSyncResult.type !== "warning") {
                            if (isCurrentRequest()) setRegionalPrepared(true);
                        }
                    }
                    if (isCurrentRequest()) setWmrLocalSyncResult(localSyncResult);
                },
                error: async code => {
                    if (isCurrentRequest()) {
                        setWmrLocalSyncResult({
                            type: "error",
                            message: `${i18n.t("Failed to prepare synchronization rule")}: ${code}`,
                        });
                    }
                },
            });
        } catch (error) {
            if (isCurrentRequest()) {
                setWmrLocalSyncResult({
                    type: "error",
                    message: error instanceof Error ? error.message : i18n.t("Synchronization failed."),
                });
            }
        } finally {
            loading.hide();
        }
    }, [
        compositionRoot.reports,
        compositionRoot.sync,
        compositionRoot.wmr,
        definition,
        destinationOrgUnits,
        flowKind,
        loading,
        regionalMonthRange,
        preparationInputKey,
        mountedRef,
        latestRequestRef,
        currentInputKeyRef,
        setRegionalPrepared,
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
