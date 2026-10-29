import React from "react";
import { Wizard, WizardStep } from "@eyeseetea/d2-ui-components";
import i18n from "../../../utils/i18n";
import { getWmrSetupBlocker, WmrSetupBlocker } from "../../../domain/entities/wmr/entities/WmrSetup";
import { WmrSetup } from "./WmrSetup";
import { MapWmrData } from "./MapWmrData";
import { SyncAndCheckWmr } from "./SyncAndCheckWmr";
import { SubmitWmr } from "./SubmitWmr";
import { useWmrContext } from "./context/WmrContext";

function getSetupBlockerMessage(blocker: WmrSetupBlocker): string {
    switch (blocker.type) {
        case "noFlow":
            return i18n.t("Choose a reporting flow before proceeding.");
        case "requisites":
            return i18n.t("Install the metadata of the flow before proceeding.");
        case "targetInstance":
            return i18n.t("Select the target instance before proceeding.");
        case "level":
            return i18n.t(
                "Assign output organisation units to the Regional monthly staging data set before proceeding."
            );
    }
}

export function WmrWizard() {
    const { requisitesReady, syncRule, flowKind, targetInstance, targetDataSetId, regionalOutputOrgUnits } =
        useWmrContext();

    const setupBlocker = React.useMemo(
        () =>
            getWmrSetupBlocker({
                flowKind,
                requisitesReady,
                hasTargetInstance: Boolean(targetInstance),
                regionalOutputOrgUnits,
            }),
        [flowKind, requisitesReady, targetInstance, regionalOutputOrgUnits]
    );

    const onStepChangeRequest = React.useCallback(
        async (currentStep: WizardStep) => {
            if (currentStep.key === "metadata-package" && setupBlocker) {
                return [getSetupBlockerMessage(setupBlocker)];
            } else if (currentStep.key === "metadata-package" && flowKind === "regional" && !targetDataSetId) {
                return [i18n.t("Select an accessible AFRO Monthly data set before proceeding.")];
            } else if (currentStep.key === "map-server-data" && (!syncRule?.localDataSetId || !syncRule.flow)) {
                return [i18n.t("Please select a source data set before proceeding.")];
            } else if (currentStep.key === "check-data" && !syncRule?.rule.metadataIds.length) {
                return [i18n.t("Please Sync your server data to the WMR Country Sync form before proceeding.")];
            }
            return undefined;
        },
        [
            setupBlocker,
            flowKind,
            targetDataSetId,
            syncRule?.localDataSetId,
            syncRule?.flow,
            syncRule?.rule.metadataIds.length,
        ]
    );

    const steps = React.useMemo((): WizardStep[] => {
        return [
            {
                component: () => <WmrSetup />,
                key: "metadata-package",
                label: i18n.t("Setup"),
            },
            {
                component: () => <MapWmrData />,
                key: "map-server-data",
                label: i18n.t("Map Server data"),
            },
            {
                component: () => <SyncAndCheckWmr />,
                key: "check-data",
                label: i18n.t("Sync & Check Data"),
            },
            {
                component: () => <SubmitWmr />,
                key: "submit-data",
                label: i18n.t("Submit Data"),
            },
        ];
    }, []);

    return (
        <Wizard
            useSnackFeedback
            steps={steps}
            initialStepKey="metadata-package"
            onStepChangeRequest={onStepChangeRequest}
        />
    );
}
