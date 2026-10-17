import React from "react";
import { useLoading } from "@eyeseetea/d2-ui-components";
import { Button, Typography, Box } from "@material-ui/core";
import { CloudUpload as SyncIcon } from "@material-ui/icons";
import i18n from "../../../utils/i18n";
import { Maybe } from "../../../types/utils";
import { Id } from "../../../domain/common/entities/Schemas";
import { OrgUnitInput } from "./components/OrgUnitInput";
import { NoticeBox } from "./components/NoticeBox";
import { useSyncRemoteWmr } from "./hooks/useSyncRemoteWmr";
import { SummaryTable } from "../../react/core/components/sync-summary/SummaryTable";
import { useWmrContext } from "./context/WmrContext";
import { WmrFlowLabel } from "./components/WmrFlowLabel";
import { useWmrTargetOrgUnit } from "./hooks/useWmrTargetOrgUnit";

export function SubmitWmr() {
    const loading = useLoading();
    const { syncRule, targetInstance } = useWmrContext();
    const [targetOrgUnitId, setTargetOrgUnitId] = React.useState<Maybe<Id>>();
    const { syncRemoteWmr, wmrRemoteSyncResult } = useSyncRemoteWmr({
        instance: targetInstance,
        targetOrgUnitId,
    });
    const { savedTargetOrgUnit, saveTargetOrgUnit } = useWmrTargetOrgUnit(targetInstance);

    const onOrgUnitValidated = React.useCallback(
        (orgUnitId: Id) => {
            setTargetOrgUnitId(orgUnitId);
            saveTargetOrgUnit(orgUnitId);
        },
        [saveTargetOrgUnit]
    );

    const sendIsDisabled = !targetInstance?.url || !targetOrgUnitId || loading.isLoading;
    if (wmrRemoteSyncResult) {
        return (
            <Box>
                <Typography variant="h4" gutterBottom>
                    {i18n.t("Submit WMR Data")}
                </Typography>
                {wmrRemoteSyncResult?.type === "success" ? (
                    <NoticeBox type="success" message={i18n.t("Data successfully submitted to the target instance.")} />
                ) : wmrRemoteSyncResult?.type === "warning" ? (
                    <NoticeBox type="warning" message={i18n.t("Data submitted with warnings.")} />
                ) : (
                    <NoticeBox
                        type="error"
                        message={wmrRemoteSyncResult.message || i18n.t("Data submission failed.")}
                    />
                )}
                {wmrRemoteSyncResult.stats && <SummaryTable stats={[wmrRemoteSyncResult.stats]} />}
            </Box>
        );
    }
    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                {i18n.t("Submit WMR Data")}
            </Typography>
            <Box>
                <NoticeBox
                    type="info"
                    message={i18n.t(
                        "Your data is ready for submission. Provide the target organisation unit and send the data."
                    )}
                />
            </Box>
            {syncRule?.flow && <WmrFlowLabel flow={syncRule.flow} />}
            {targetInstance?.url && savedTargetOrgUnit.type === "loaded" && (
                <Box p={2}>
                    <OrgUnitInput
                        key={targetInstance.id}
                        instance={targetInstance}
                        initialValue={savedTargetOrgUnit.orgUnitId}
                        onChange={onOrgUnitValidated}
                    />
                </Box>
            )}
            <Box p={2}>
                <NoticeBox
                    type={targetInstance?.url ? "success" : "error"}
                    message={
                        targetInstance?.url
                            ? i18n.t("Target instance: {{name}} ({{url}})", {
                                  name: targetInstance.name,
                                  url: targetInstance.url,
                                  nsSeparator: false,
                                  interpolation: { escapeValue: false },
                              })
                            : i18n.t("Please select a target instance to submit the data")
                    }
                />
                <NoticeBox
                    type={targetOrgUnitId ? "success" : "error"}
                    message={
                        targetOrgUnitId
                            ? `${i18n.t("Target Organisation Unit Id")}: ${targetOrgUnitId}`
                            : i18n.t("Please provide a target organisation unit ID and Validate it")
                    }
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={syncRemoteWmr}
                    endIcon={<SyncIcon />}
                    disabled={sendIsDisabled}
                    style={{ margin: "1em 0" }}
                >
                    {i18n.t("Send DataValues to target instance")}
                </Button>
            </Box>
        </Box>
    );
}
