import { useLoading } from "@eyeseetea/d2-ui-components";
import React from "react";
import { Id } from "../../../../domain/common/entities/Schemas";
import { Instance } from "../../../../domain/instance/entities/Instance";
import { Maybe } from "../../../../types/utils";
import i18n from "../../../../utils/i18n";

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
    const loading = useLoading();
    const [wmrRemoteSyncResult, setWmrRemoteSyncResult] = React.useState<WmrRemoteSyncResult | null>(null);

    const syncRemoteWmr = React.useCallback(async () => {
        if (!instance || !targetOrgUnitId) {
            setWmrRemoteSyncResult({
                type: "error",
                message: i18n.t("Instance or target organisation unit ID is not provided."),
            });
            return;
        }
        loading.show(true, i18n.t("Sending data to target instance..."));
        // TODO: Implement actual sync
        await new Promise(resolve => setTimeout(resolve, 1000));
        loading.show(true, i18n.t("Sync in progress..."));
        await new Promise(resolve => setTimeout(resolve, 1000));
        loading.hide();
        setWmrRemoteSyncResult({ type: "success" });
    }, [instance, targetOrgUnitId, loading]);

    return {
        syncRemoteWmr,
        wmrRemoteSyncResult,
    };
}
