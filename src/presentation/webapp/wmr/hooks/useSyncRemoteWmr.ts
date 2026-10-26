import { useLoading } from "@eyeseetea/d2-ui-components";
import React from "react";
import { Id } from "../../../../domain/common/entities/Schemas";
import { Instance } from "../../../../domain/instance/entities/Instance";
import { SynchronizationStats } from "../../../../domain/reports/entities/SynchronizationResult";
import { SynchronizationReport } from "../../../../domain/reports/entities/SynchronizationReport";
import { isOrgUnitMapped } from "../../../../domain/entities/wmr/entities/WmrOrgUnits";
import { Maybe } from "../../../../types/utils";
import i18n from "../../../../utils/i18n";
import { useAppContext } from "../../../react/core/contexts/AppContext";
import { useWmrContext } from "../context/WmrContext";
import { useMappingDataElements } from "./useMappingDataElements";
import { getWmrRangeMonths, getWmrReportedYear } from "../../../../domain/entities/wmr/entities/WmrSyncFlow";
import {
    getWmrSubmitTarget,
    WmrSubmitTarget,
    wmrFlowDefinitions,
} from "../../../../domain/entities/wmr/entities/WmrFlowKind";

export type WmrRemoteSyncResult = Readonly<
    { stats?: SynchronizationStats } & ({ type: "success" } | { type: "error"; message: string } | { type: "warning" })
>;

type UseSyncRemoteWmrOptions = Readonly<{
    instance: Maybe<Instance>;
    targetOrgUnitId?: Id;
}>;

export function summarizeWmrRemoteSync(report?: SynchronizationReport): WmrRemoteSyncResult {
    if (!report) {
        return { type: "error", message: i18n.t("Synchronization did not return a report.") };
    }
    const results = report.getResults();
    const failedResult = results.find(
        result => result.status === "ERROR" || result.status === "NETWORK ERROR" || !!result.errors?.length
    );
    if (report.status === "FAILURE" || failedResult) {
        const conflicts = failedResult?.errors?.map(({ message }) => message).join(" ");
        return {
            type: "error",
            message: conflicts || failedResult?.message || i18n.t("Synchronization failed."),
            stats: failedResult?.stats,
        };
    }
    if (results.length === 0 || results.some(result => result.status === "PENDING")) {
        return { type: "error", message: i18n.t("Synchronization did not return a completed result.") };
    }
    const stats = results[0]?.stats;
    return results.some(result => result.status === "WARNING")
        ? { type: "warning", stats }
        : { type: "success", stats };
}

export function useSyncRemoteWmr(options: UseSyncRemoteWmrOptions) {
    const { instance, targetOrgUnitId } = options;
    const { compositionRoot } = useAppContext();
    const {
        settings,
        syncRule,
        regionalOutputOrgUnits,
        orgUnitMapping,
        regionalMonthRange,
        regionalPrepared,
        targetDataSetId,
    } = useWmrContext();
    const loading = useLoading();
    const [wmrRemoteSyncResult, setWmrRemoteSyncResult] = React.useState<WmrRemoteSyncResult | null>(null);
    const selectedSourceDataElementIds = React.useMemo(
        () => (settings && syncRule ? settings.getSourceMetadataIds(syncRule.localDataSetId) : undefined),
        [settings, syncRule]
    );
    const { dataElementsToMigrate } = useMappingDataElements("REMOTE", selectedSourceDataElementIds);

    const flowKind = syncRule?.flow?.kind;
    const submitTarget = React.useMemo<Maybe<WmrSubmitTarget>>(
        () =>
            settings && flowKind
                ? getWmrSubmitTarget(
                      wmrFlowDefinitions[flowKind],
                      settings.countryOrgUnit,
                      regionalOutputOrgUnits,
                      targetOrgUnitId
                  )
                : undefined,
        [settings, flowKind, regionalOutputOrgUnits, targetOrgUnitId]
    );

    const syncRemoteWmr = React.useCallback(async () => {
        if (flowKind === "regional" && !regionalPrepared) {
            setWmrRemoteSyncResult({ type: "error", message: i18n.t("Prepare the selected monthly data before sending.") });
            return;
        }
        if (!instance || !syncRule?.flow || submitTarget?.type !== "ready" ||
            (flowKind === "regional" && (!targetDataSetId || !regionalOutputOrgUnits.length))) {
            setWmrRemoteSyncResult({
                type: "error",
                message: i18n.t("Instance, target data set or target organisation unit ID is not provided."),
            });
            return;
        }
        if (!dataElementsToMigrate.length) {
            setWmrRemoteSyncResult({
                type: "error",
                message: i18n.t("No mapped data elements found for the selected data set."),
            });
            return;
        }
        if (flowKind === "regional" && regionalOutputOrgUnits.some(({ id }) => !isOrgUnitMapped(orgUnitMapping, id))) {
            setWmrRemoteSyncResult({
                type: "error",
                message: i18n.t("Map every selected output organisation unit to the target instance before sending."),
            });
            return;
        }
        const { orgUnitPaths, orgUnitIdOverride } = submitTarget;
        const destinationDataSetId = flowKind === "regional" ? targetDataSetId : undefined;
        const syncRuleUpdated = syncRule.rule
            .updateTargetInstances([instance.id])
            .updateBuilder({ metadataIds: dataElementsToMigrate })
            .updateDataSyncEnableAggregation(false)
            .updateDataSyncAggregationType(undefined)
            .updateDataSyncOrgUnitPaths([...orgUnitPaths])
            .updateBuilderDataParams({ runAnalyticsBefore: false, runAnalyticsAfter: false });
        const periods =
            flowKind === "regional"
                ? getWmrRangeMonths(regionalMonthRange)
                : [getWmrReportedYear(syncRuleUpdated.dataParams)];
        loading.show();

        try {
            const result = await compositionRoot.sync.prepare(syncRuleUpdated.type, syncRuleUpdated.toBuilder());
            const sync = compositionRoot.wmr.syncDataset(syncRuleUpdated.toBuilder());

            const synchronize = async () => {
                for await (const { message, syncReport, done } of sync.execute({
                    orgUnitIdOverride,
                    periods,
                    ...(destinationDataSetId ? { targetDataSetId: destinationDataSetId } : {}),
                })) {
                    if (message) loading.show(true, message);
                    if (syncReport) await compositionRoot.reports.save(syncReport);
                    if (done) return syncReport;
                }
                return undefined;
            };

            await result.match({
                success: async () => {
                    const report = await synchronize();
                    const syncResult = summarizeWmrRemoteSync(report);
                    setWmrRemoteSyncResult(syncResult);
                    if (syncResult.type === "success") {
                        syncRule.rule = syncRuleUpdated;
                    }
                },
                error: async code => {
                    setWmrRemoteSyncResult({
                        type: "error",
                        message: `Failed to prepare synchronization rule: ${code}`,
                    });
                },
            });
        } catch (error) {
            setWmrRemoteSyncResult({
                type: "error",
                message: error instanceof Error ? error.message : i18n.t("Synchronization failed."),
            });
        } finally {
            loading.hide();
        }
    }, [
        instance,
        submitTarget,
        syncRule,
        loading,
        compositionRoot.sync,
        compositionRoot.wmr,
        compositionRoot.reports,
        dataElementsToMigrate,
        flowKind,
        regionalMonthRange,
        regionalPrepared,
        regionalOutputOrgUnits,
        orgUnitMapping,
        targetDataSetId,
    ]);

    return {
        syncRemoteWmr,
        wmrRemoteSyncResult,
        submitTarget,
    };
}
