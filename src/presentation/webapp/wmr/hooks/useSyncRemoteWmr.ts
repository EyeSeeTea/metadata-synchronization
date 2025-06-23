import { useLoading } from "@eyeseetea/d2-ui-components";
import React from "react";
import { Id } from "../../../../domain/common/entities/Schemas";
import { Instance } from "../../../../domain/instance/entities/Instance";
import { Maybe } from "../../../../types/utils";
import i18n from "../../../../utils/i18n";
import { useAppContext } from "../../../react/core/contexts/AppContext";
import { useWmrContext } from "../context/WmrContext";

type WmrRemoteSyncResult =
    | {
          type: "success";
      }
    | {
          type: "error";
          message: string;
      };

type UseSyncRemoteWmrOptions = {
    instance: Maybe<Instance>;
    targetOrgUnitId: Maybe<Id>;
};

export function useSyncRemoteWmr(options: UseSyncRemoteWmrOptions) {
    const { instance, targetOrgUnitId } = options;
    const { compositionRoot } = useAppContext();
    const { syncRule } = useWmrContext();
    const loading = useLoading();
    const [wmrRemoteSyncResult, setWmrRemoteSyncResult] = React.useState<WmrRemoteSyncResult | null>(null);

    React.useEffect(() => {
        if (!syncRule) {
            return;
        }
        // TODO: use this property on sync-rule or remove it?
        syncRule.targetOrgUnitId = targetOrgUnitId;
    }, [syncRule, targetOrgUnitId]);

    const syncRemoteWmr = React.useCallback(async () => {
        if (!instance || !targetOrgUnitId || !syncRule) {
            setWmrRemoteSyncResult({
                type: "error",
                message: i18n.t("Instance or target organisation unit ID is not provided."),
            });
            return;
        }
        const syncRuleUpdated = syncRule?.rule.updateTargetInstances([instance.id]);

        loading.show();

        const result = await compositionRoot.sync.prepare(syncRuleUpdated.type, syncRuleUpdated.toBuilder());
        const sync = compositionRoot.wmr.syncDataset(syncRuleUpdated.toBuilder());

        const synchronize = async () => {
            for await (const { message, syncReport, done } of sync.execute(targetOrgUnitId)) {
                if (message) loading.show(true, message);
                if (syncReport) await compositionRoot.reports.save(syncReport);
                if (done) {
                    loading.hide();
                    return;
                }
            }
        };

        await result.match({
            success: async () => {
                // TODO: Error handling here?
                await synchronize();
                syncRule.rule = syncRuleUpdated;
                setWmrRemoteSyncResult({ type: "success" });
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
        targetOrgUnitId,
        syncRule,
        loading,
        compositionRoot.sync,
        compositionRoot.wmr,
        compositionRoot.reports,
    ]);

    return {
        syncRemoteWmr,
        wmrRemoteSyncResult,
    };
}
