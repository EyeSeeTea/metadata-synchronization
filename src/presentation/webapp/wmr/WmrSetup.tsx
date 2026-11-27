import { Box, Typography } from "@material-ui/core";
import React from "react";
import { wmrFlowDefinitions } from "../../../domain/entities/wmr/entities/WmrFlowKind";
import i18n from "../../../utils/i18n";
import { RemoteInstanceSelector } from "./components/RemoteInstanceSelector";
import { WmrFlowSelector } from "./components/WmrFlowSelector";
import { WmrOrgUnitLevelSelector } from "./components/WmrOrgUnitLevelSelector";
import { WmrOrgUnitMapping } from "./components/WmrOrgUnitMapping";
import { WmrSetupSection } from "./components/WmrSetupSection";
import { WmrTargetDataSetSelector } from "./components/WmrTargetDataSetSelector";
import { useWmrContext } from "./context/WmrContext";
import { InstallMetadataPackage } from "./InstallMetadataPackage";

export function WmrSetup() {
    const {
        flowKind,
        setFlowKind,
        requisitesReady,
        targetInstance,
        setTargetInstance,
        targetDataSetId,
        setTargetDataSetId,
        regionalOutputOrgUnits,
    } = useWmrContext();
    const definition = flowKind && wmrFlowDefinitions[flowKind];

    const metadataLocked = !definition;
    const instanceLocked = metadataLocked || !requisitesReady;
    const orgUnitsLocked = instanceLocked || !targetInstance;
    const mappingLocked = orgUnitsLocked || regionalOutputOrgUnits.length === 0;

    return (
        <Box>
            <Typography variant="h5" component="h1">
                {i18n.t("Setup WMR")}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
                {i18n.t("Choose the report, install what the report flow requires, then connect the target instance.")}
            </Typography>

            <WmrSetupSection
                number={1}
                title={i18n.t("Reporting flow")}
                hint={i18n.t("The flow decides which forms are installed and how data reaches the target instance.")}
                locked={false}
            >
                <WmrFlowSelector value={flowKind} onChange={setFlowKind} />
            </WmrSetupSection>

            <WmrSetupSection
                number={2}
                title={i18n.t("Metadata")}
                hint={
                    flowKind === "regional"
                        ? i18n.t("The Regional flow uses the Global Country Sync and a local monthly staging data set.")
                        : i18n.t("Two packages for the Global flow.")
                }
                locked={metadataLocked}
            >
                {definition && <InstallMetadataPackage requisites={definition.requisites} />}
            </WmrSetupSection>

            <WmrSetupSection
                number={3}
                title={i18n.t("Target instance")}
                hint={i18n.t("Where step 4 submits the data.")}
                locked={instanceLocked}
                lockNote={i18n.t("Available once the metadata of the flow is installed.")}
            >
                <RemoteInstanceSelector
                    value={targetInstance ?? null}
                    onChange={instance => setTargetInstance(instance ?? undefined)}
                />
            </WmrSetupSection>

            {flowKind === "regional" && (
                <WmrSetupSection
                    number={4}
                    title={i18n.t("AFRO Monthly data set")}
                    hint={i18n.t(
                        "Choose the accessible Monthly data set that will receive the selected district values."
                    )}
                    locked={orgUnitsLocked}
                    lockNote={i18n.t("Available once the target instance is selected.")}
                >
                    {targetInstance && (
                        <WmrTargetDataSetSelector
                            key={targetInstance.id}
                            instance={targetInstance}
                            value={targetDataSetId ?? undefined}
                            onChange={setTargetDataSetId}
                        />
                    )}
                </WmrSetupSection>
            )}

            {definition?.destinationOrgUnits === "selected" && (
                <WmrSetupSection
                    number={5}
                    title={i18n.t("Output organisation units")}
                    hint={i18n.t(
                        "The Regional monthly staging data set is assigned to every organisation unit of the chosen level in the country. The selected organisation units receive their own monthly values for submission."
                    )}
                    locked={orgUnitsLocked}
                    lockNote={i18n.t("Available once the target instance is selected.")}
                >
                    <WmrOrgUnitLevelSelector />
                </WmrSetupSection>
            )}

            {definition?.targetOrgUnit === "mapping" && (
                <>
                    <WmrSetupSection
                        number={6}
                        title={i18n.t("Organisation unit mapping")}
                        hint={i18n.t(
                            "Map each selected output organisation unit to its organisation unit in {{instance}}.",
                            {
                                instance: targetInstance?.name ?? i18n.t("the target instance"),
                                interpolation: { escapeValue: false },
                            }
                        )}
                        locked={mappingLocked}
                        lockNote={i18n.t(
                            "Available once output organisation units are assigned to the Regional monthly staging data set."
                        )}
                    >
                        {!mappingLocked && targetInstance && (
                            <WmrOrgUnitMapping key={targetInstance.id} instance={targetInstance} />
                        )}
                    </WmrSetupSection>
                </>
            )}
        </Box>
    );
}
