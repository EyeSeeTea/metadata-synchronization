import React from "react";
import { Wizard, WizardStep } from "@eyeseetea/d2-ui-components";
import i18n from "../../../utils/i18n";
import { InstallMetadataPackage } from "./InstallMetadataPackage";
import { MapWmrData } from "./MapWmrData";
import { MapWmrOrgUnits } from "./MapWmrOrgUnits";
import { PreviewWmr } from "./PreviewWmr";
import { SynchronizationRule } from "../../../domain/rules/entities/SynchronizationRule";
import { useWmrSettings } from "./hooks/useWmrSettings";
import { WmrSettings } from "../../../domain/entities/wmr/entities/WmrSettings";
import { Id } from "../../../domain/common/entities/Schemas";
import { Maybe } from "../../../types/utils";
import { SubmitWmr } from "./SubmitWmr";

export type WmrPageProps = {};
export type WmrSyncRule = { localDataSetId: Maybe<Id>; rule: SynchronizationRule };

export function WmrPage() {
    const { settings } = useWmrSettings();
    const syncRuleRef = React.useRef<WmrSyncRule>({
        localDataSetId: undefined,
        rule: SynchronizationRule.createOnDemand("aggregated")
            .updateBuilder({ metadataIds: [] })
            .updateMetadataTypes(["dataElements"])
            .updateDataSyncOrgUnitPaths([])
            .updateDataSyncPeriod("LAST_YEAR")
            .updateTargetInstances([WmrSettings.LOCAL_INSTANCE_ID]),
    });

    const steps = React.useMemo((): WizardStep[] => {
        return [
            {
                component: () => <InstallMetadataPackage />,
                key: "metadata-package",
                label: i18n.t("Metadata package"),
            },
            {
                component: () => <MapWmrData settings={settings} wmrSyncRule={syncRuleRef.current} />,
                key: "map-server-data",
                label: i18n.t("Map Server data"),
            },
            {
                component: () => <MapWmrOrgUnits settings={settings} wmrSyncRule={syncRuleRef.current} />,
                key: "map-org-units",
                label: i18n.t("Map Org units"),
            },
            {
                component: () => <PreviewWmr settings={settings} wmrSyncRule={syncRuleRef.current} />,
                key: "check-data",
                label: i18n.t("Check Data"),
            },
            {
                component: () => <SubmitWmr settings={settings} wmrSyncRule={syncRuleRef.current} />,
                key: "submit-data",
                label: i18n.t("Submit Data"),
            },
        ];
    }, [settings]);

    return <Wizard useSnackFeedback steps={steps} initialStepKey="metadata-package" />;
}
