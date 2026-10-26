import { useLoading } from "@eyeseetea/d2-ui-components";
import React from "react";
import { Id } from "../../../../domain/common/entities/Schemas";
import { Instance } from "../../../../domain/instance/entities/Instance";
import { SynchronizationStats } from "../../../../domain/reports/entities/SynchronizationResult";
import { Maybe } from "../../../../types/utils";
import i18n from "../../../../utils/i18n";
import { useAppContext } from "../../../react/core/contexts/AppContext";
import { useWmrContext } from "../context/WmrContext";
import { useMappingDataElements } from "./useMappingDataElements";
import { getWmrReportedYear } from "../../../../domain/entities/wmr/entities/WmrSyncFlow";
import {
    getWmrSubmitTarget,
    WmrSubmitTarget,
    wmrFlowDefinitions,
} from "../../../../domain/entities/wmr/entities/WmrFlowKind";
import { getWmrRegionalSubmissionWarning, isWmrRegionalSubmissionAvailable } from "../wmrRegionalSubmission";

export type WmrRemoteSyncResult = Readonly<
    { stats?: SynchronizationStats } & ({ type: "success" } | { type: "error"; message: string } | { type: "warning" })
>;

type UseSyncRemoteWmrOptions = Readonly<{
    instance: Maybe<Instance>;
    targetOrgUnitId?: Id;
}>;

export function useSyncRemoteWmr(options: UseSyncRemoteWmrOptions) {
    const { instance, targetOrgUnitId } = options;
    const { compositionRoot } = useAppContext();
    const { settings, syncRule, regionalParents } = useWmrContext();
    const loading = useLoading();
    const [wmrRemoteSyncResult, setWmrRemoteSyncResult] = React.useState<WmrRemoteSyncResult | null>(null);
    const { dataElementsToMigrate } = useMappingDataElements("REMOTE");

    const flowKind = syncRule?.flow?.kind;
    const submitTarget = React.useMemo<Maybe<WmrSubmitTarget>>(
        () =>
            settings && flowKind
                ? getWmrSubmitTarget(
                      wmrFlowDefinitions[flowKind],
                      settings.countryOrgUnit,
                      regionalParents,
                      targetOrgUnitId
                  )
                : undefined,
        [settings, flowKind, regionalParents, targetOrgUnitId]
    );

    const syncRemoteWmr = React.useCallback(async () => {
        if (!isWmrRegionalSubmissionAvailable(flowKind)) {
            setWmrRemoteSyncResult({ type: "error", message: getWmrRegionalSubmissionWarning() });
            return;
        }
        if (!instance || !syncRule || submitTarget?.type !== "ready") {
            setWmrRemoteSyncResult({
                type: "error",
                message: i18n.t("Instance or target organisation unit ID is not provided."),
            });
            return;
        }
        const { orgUnitPaths, orgUnitIdOverride } = submitTarget;
        const syncRuleUpdated = syncRule.rule
            .updateTargetInstances([instance.id])
            .updateBuilder({ metadataIds: dataElementsToMigrate })
            .updateDataSyncEnableAggregation(false)
            .updateDataSyncAggregationType(undefined)
            .updateDataSyncOrgUnitPaths([...orgUnitPaths]);
        const periods = [getWmrReportedYear(syncRuleUpdated.dataParams)];
        loading.show();

        const result = await compositionRoot.sync.prepare(syncRuleUpdated.type, syncRuleUpdated.toBuilder());
        const sync = compositionRoot.wmr.syncDataset(syncRuleUpdated.toBuilder());

        const synchronize = async () => {
            for await (const { message, syncReport, done } of sync.execute({
                orgUnitIdOverride,
                periods,
            })) {
                if (message) loading.show(true, message);
                if (syncReport) await compositionRoot.reports.save(syncReport);
                if (done) {
                    loading.hide();
                    return syncReport;
                }
            }
        };

        await result.match({
            success: async () => {
                // TODO: Error handling here?
                const report = await synchronize();
                const result = report?.getResults()[0];
                if (result?.status === "ERROR") {
                    setWmrRemoteSyncResult({
                        type: "error",
                        message: result.message ?? "Synchronization result has errors",
                        stats: result.stats,
                    });
                } else if (result?.status === "WARNING") {
                    setWmrRemoteSyncResult({
                        type: "warning",
                        stats: result.stats,
                    });
                } else {
                    setWmrRemoteSyncResult({ type: "success", stats: result?.stats });
                }
                syncRule.rule = syncRuleUpdated;
            },
            error: async code => {
                setWmrRemoteSyncResult({
                    type: "error",
                    message: `Failed to prepare synchronization rule: ${code}`,
                });
            },
        });
    }, [
        instance,
        flowKind,
        submitTarget,
        syncRule,
        loading,
        compositionRoot.sync,
        compositionRoot.wmr,
        compositionRoot.reports,
        dataElementsToMigrate,
    ]);

    return {
        syncRemoteWmr,
        wmrRemoteSyncResult,
        submitTarget,
    };
}
