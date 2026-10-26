import React from "react";
import { useLoading } from "@eyeseetea/d2-ui-components";
import { Button, Typography, Box } from "@material-ui/core";
import { CloudUpload as SyncIcon } from "@material-ui/icons";
import i18n from "../../../utils/i18n";
import { Maybe } from "../../../types/utils";
import { Id } from "../../../domain/common/entities/Schemas";
import { Instance } from "../../../domain/instance/entities/Instance";
import { WmrFlow } from "../../../domain/entities/wmr/entities/WmrSettings";
import { WmrFlowDefinition, wmrFlowDefinitions } from "../../../domain/entities/wmr/entities/WmrFlowKind";
import { getWmrReportedYear, WmrMonthRange } from "../../../domain/entities/wmr/entities/WmrSyncFlow";
import { OrgUnitInput } from "./components/OrgUnitInput";
import { NoticeBox } from "./components/NoticeBox";
import { useSyncRemoteWmr, WmrRemoteSyncResult } from "./hooks/useSyncRemoteWmr";
import { SummaryTable } from "../../react/core/components/sync-summary/SummaryTable";
import { useWmrContext } from "./context/WmrContext";
import { WmrFlowLabel } from "./components/WmrFlowLabel";
import { WmrSyncPeriod } from "./components/WmrSyncPeriod";
import { useWmrTargetOrgUnit } from "./hooks/useWmrTargetOrgUnit";
import { getWmrRegionalSubmissionWarning, isWmrRegionalSubmissionAvailable } from "./wmrRegionalSubmission";

export function SubmitWmr() {
    const loading = useLoading();
    const { syncRule, targetInstance, regionalParents, regionalMonthRange } = useWmrContext();
    const [targetOrgUnitId, setTargetOrgUnitId] = React.useState<Id>();
    const { syncRemoteWmr, wmrRemoteSyncResult, submitTarget } = useSyncRemoteWmr({
        instance: targetInstance,
        targetOrgUnitId,
    });
    if (!syncRule?.flow) {
        throw new Error("WMR Context should be initialized");
    }
    const { flow } = syncRule;
    const definition = wmrFlowDefinitions[flow.kind];
    const regionalSubmissionAvailable = isWmrRegionalSubmissionAvailable(flow.kind);
    const year = getWmrReportedYear(syncRule.rule.dataParams);
    const monthRange = definition.sumIntoYear ? regionalMonthRange : undefined;
    const header = <WmrSubmitHeader flow={flow} year={year} monthRange={monthRange} />;

    if (wmrRemoteSyncResult) {
        return (
            <Box>
                {header}
                <WmrRemoteSyncResultNotice result={wmrRemoteSyncResult} />
                {wmrRemoteSyncResult.stats && <SummaryTable stats={[wmrRemoteSyncResult.stats]} />}
            </Box>
        );
    }

    const sendIsDisabled =
        !regionalSubmissionAvailable || !targetInstance?.url || submitTarget?.type !== "ready" || loading.isLoading;

    return (
        <Box>
            {header}
            {regionalSubmissionAvailable && <NoticeBox type="info" message={describeWmrSubmitIntro(definition)} />}
            {!regionalSubmissionAvailable && (
                <NoticeBox type="warning" message={getWmrRegionalSubmissionWarning()} />
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
                {definition.targetOrgUnit === "override" ? (
                    targetInstance?.url && (
                        <WmrTargetOrgUnitOverride
                            instance={targetInstance}
                            targetOrgUnitId={targetOrgUnitId}
                            onChange={setTargetOrgUnitId}
                        />
                    )
                ) : (
                    <NoticeBox
                        type="info"
                        message={i18n.t("Values are sent to the {{count}} organisation units mapped in step 1.", {
                            count: regionalParents.length,
                        })}
                    />
                )}
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

type WmrSubmitHeaderProps = Readonly<{ flow: WmrFlow; year: string; monthRange?: WmrMonthRange }>;

function WmrSubmitHeader({ flow, year, monthRange }: WmrSubmitHeaderProps) {
    return (
        <Box mb={2}>
            <Typography variant="h4" gutterBottom>
                {i18n.t("Submit WMR Data")}
            </Typography>
            <WmrFlowLabel flow={flow} />
            <WmrSyncPeriod year={year} monthRange={monthRange} />
        </Box>
    );
}

function describeWmrSubmitIntro(definition: WmrFlowDefinition): string {
    switch (definition.targetOrgUnit) {
        case "override":
            return i18n.t("Your data is ready for submission. Provide the target organisation unit and send the data.");
        case "mapping":
            return i18n.t("Your data is ready for submission. Send the data to the target instance.");
    }
}

type WmrTargetOrgUnitOverrideProps = Readonly<{
    instance: Instance;
    targetOrgUnitId: Maybe<Id>;
    onChange: (orgUnitId: Id) => void;
}>;

function WmrTargetOrgUnitOverride({ instance, targetOrgUnitId, onChange }: WmrTargetOrgUnitOverrideProps) {
    const { savedTargetOrgUnit, saveTargetOrgUnit } = useWmrTargetOrgUnit(instance);

    const onOrgUnitValidated = React.useCallback(
        (orgUnitId: Id) => {
            onChange(orgUnitId);
            saveTargetOrgUnit(orgUnitId);
        },
        [onChange, saveTargetOrgUnit]
    );

    return (
        <>
            {savedTargetOrgUnit.type === "loaded" && (
                <Box py={2}>
                    <OrgUnitInput
                        key={instance.id}
                        instance={instance}
                        initialValue={savedTargetOrgUnit.orgUnitId}
                        onChange={onOrgUnitValidated}
                    />
                </Box>
            )}
            <NoticeBox
                type={targetOrgUnitId ? "success" : "error"}
                message={
                    targetOrgUnitId
                        ? `${i18n.t("Target Organisation Unit Id")}: ${targetOrgUnitId}`
                        : i18n.t("Please provide a target organisation unit ID and Validate it")
                }
            />
        </>
    );
}

function WmrRemoteSyncResultNotice({ result }: Readonly<{ result: WmrRemoteSyncResult }>) {
    switch (result.type) {
        case "success":
            return <NoticeBox type="success" message={i18n.t("Data successfully submitted to the target instance.")} />;
        case "warning":
            return <NoticeBox type="warning" message={i18n.t("Data submitted with warnings.")} />;
        case "error":
            return <NoticeBox type="error" message={result.message || i18n.t("Data submission failed.")} />;
    }
}
