import { Box, Typography } from "@material-ui/core";
import React from "react";
import { wmrFlowDefinitions } from "../../../domain/entities/wmr/entities/WmrFlowKind";
import i18n from "../../../utils/i18n";
import { RemoteInstanceSelector } from "./components/RemoteInstanceSelector";
import { WmrFlowSelector } from "./components/WmrFlowSelector";
import { WmrOrgUnitLevelSelector } from "./components/WmrOrgUnitLevelSelector";
import { WmrOrgUnitMapping } from "./components/WmrOrgUnitMapping";
import { WmrSetupSection } from "./components/WmrSetupSection";
import { useWmrContext } from "./context/WmrContext";
import { InstallMetadataPackage } from "./InstallMetadataPackage";

export function WmrSetup() {
    const { flowKind, setFlowKind, requisitesReady, targetInstance, setTargetInstance, regionalParents } =
        useWmrContext();
    const definition = flowKind && wmrFlowDefinitions[flowKind];

    const metadataLocked = !definition;
    const instanceLocked = metadataLocked || !requisitesReady;
    const orgUnitsLocked = instanceLocked || !targetInstance;
    const mappingLocked = orgUnitsLocked || regionalParents.length === 0;

    return (
        <Box>
            <Typography variant="h5" component="h1">
                {i18n.t("Setup WMR")}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
                {i18n.t("Choose how you report, install what the flow needs and connect the target instance.")}
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
                        ? i18n.t("The Regional flow uses the Country Sync of the Global flow plus the monthly form.")
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

            {definition?.destinationOrgUnits === "parents" && (
                <WmrSetupSection
                    number={4}
                    title={i18n.t("Organisation units of the monthly form")}
                    hint={i18n.t(
                        "MAL - WMR Country Form MONTHLY is assigned to every organisation unit of the chosen level in the country. Their values are summed into their parents."
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
                        number={5}
                        title={i18n.t("Organisation unit mapping")}
                        hint={i18n.t(
                            "Map each parent organisation unit that receives values to its organisation unit in {{instance}}.",
                            {
                                instance: targetInstance?.name ?? i18n.t("the target instance"),
                                interpolation: { escapeValue: false },
                            }
                        )}
                        locked={mappingLocked}
                        lockNote={i18n.t("Available once the monthly form is assigned to a level.")}
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
