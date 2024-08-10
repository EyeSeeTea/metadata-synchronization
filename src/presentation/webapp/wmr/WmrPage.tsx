import React from "react";
import { Wizard, WizardStep } from "@eyeseetea/d2-ui-components";
import i18n from "../../../types/i18n";
import { InstallMetadataPackage } from "./InstallMetadataPackage";
import { MapWmrData } from "./MapWmrData";
import { MapWmrOrgUnits } from "./MapWmrOrgUnits";
import { PreviewWmr } from "./PreviewWmr";
import { SynchronizationRule } from "../../../domain/rules/entities/SynchronizationRule";
import { useWmrSettings } from "./hooks/useWmrSettings";
import { WmrSettings } from "../../../domain/entities/wmr/entities/WmrSettings";

export type WmrPageProps = {};

export function WmrPage() {
    const { settings } = useWmrSettings();
    const [syncRule, updateRule] = React.useState<SynchronizationRule>(
        SynchronizationRule.createOnDemand("aggregated")
            .updateBuilder({ metadataIds: [] })
            .updateMetadataTypes(["dataElements"])
            .updateDataSyncOrgUnitPaths([])
            .updateDataSyncPeriod("LAST_YEAR")
            .updateTargetInstances([WmrSettings.LOCAL_INSTANCE_ID])
    );

    const steps = React.useMemo((): WizardStep[] => {
        return [
            {
                component: () => <InstallMetadataPackage />,
                key: "metadata-package",
                label: i18n.t("Metadata package"),
            },
            {
                component: () => <MapWmrData settings={settings} />,
                key: "map-server-data",
                label: i18n.t("Map Server data"),
            },
            {
                component: () => <MapWmrOrgUnits syncRule={syncRule} updateRule={updateRule} />,
                key: "map-org-units",
                label: i18n.t("Map Org units"),
            },
            {
                component: () => <PreviewWmr settings={settings} syncRule={syncRule} />,
                key: "check-data",
                label: i18n.t("Check Data"),
            },
        ];
    }, [settings, syncRule]);

    return <Wizard useSnackFeedback steps={steps} initialStepKey="metadata-package" />;
}
