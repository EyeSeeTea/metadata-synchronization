import { Box, Button, Grid, Typography } from "@material-ui/core";
import { CloudDownload as CloudDownloadIcon, CloudUpload as CloudUploadIcon } from "@material-ui/icons";
import React from "react";
import { WmrRequisiteType, wmrRequisites, wmrRequisiteTypes } from "../../../domain/entities/wmr/entities/WmrRequisite";
import i18n from "../../../utils/i18n";
import { NoticeBox } from "./components/NoticeBox";
import { useWmrSetup, WmrSetupStatus, WmrSetupStatusType } from "./hooks/useWmrSetup";

type RequisiteTexts = Readonly<{ title: string; caption: string; itemName: string }>;

function getRequisiteTexts(type: WmrRequisiteType): RequisiteTexts {
    switch (type) {
        case "metadata":
            return {
                title: i18n.t("Metadata package"),
                caption: i18n.t("This package contains the WMR dataset and its dependencies"),
                itemName: i18n.t("metadata package"),
            };
        case "dataStore":
            return {
                title: i18n.t("Autogenform configuration"),
                caption: i18n.t("Contains the dataStore configurations required by the autogenforms tool"),
                itemName: i18n.t("Autogenform configuration"),
            };
    }
}

const noticeTypeByStatus: Readonly<Record<WmrSetupStatusType, "loading" | "success" | "error" | "info">> = {
    loading: "loading",
    uploading: "loading",
    done: "success",
    error: "error",
    misassigned: "error",
    pending: "info",
};

function getStatusMessage(setupStatus: WmrSetupStatus, itemName: string): string {
    switch (setupStatus.status) {
        case "loading":
            return i18n.t("Checking {{itemName}}...", { itemName });
        case "uploading":
            return i18n.t("Uploading {{itemName}}...", { itemName });
        case "done":
            return i18n.t("The {{itemName}} is already installed.", { itemName });
        case "error":
            return i18n.t(
                "An error occurred while installing the {{itemName}}. Alternatively, you can download the configuration and import it manually",
                { itemName }
            );
        case "pending":
            return i18n.t("The {{itemName}} is not installed yet. Use the button below to install it.", { itemName });
        case "misassigned":
            return i18n.t(
                "The dataSet {{name}} is assigned to {{count}} organisation units and must be assigned only to the country",
                { name: setupStatus.dataSetName, count: setupStatus.orgUnitsCount }
            );
    }
}

function PrerequisiteItem({
    type,
    setupStatus,
    importFunction,
}: {
    type: WmrRequisiteType;
    setupStatus: WmrSetupStatus;
    importFunction: (type: WmrRequisiteType) => void;
}) {
    const { title, caption, itemName } = getRequisiteTexts(type);
    const { assetPath } = wmrRequisites[type];

    return (
        <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
                {title}
            </Typography>
            <Typography variant="caption" gutterBottom>
                {caption}
            </Typography>
            <NoticeBox type={noticeTypeByStatus[setupStatus.status]} message={getStatusMessage(setupStatus, itemName)}>
                {setupStatus.status === "pending" ? (
                    <Box py={2}>
                        <Button
                            onClick={() => importFunction(type)}
                            variant="contained"
                            color="primary"
                            endIcon={<CloudUploadIcon />}
                        >
                            {i18n.t("Setup {{itemName}}", { itemName })}
                        </Button>
                    </Box>
                ) : setupStatus.status === "error" ? (
                    <Box py={2}>
                        <Button
                            download={assetPath.split("/").pop()}
                            href={assetPath}
                            variant="contained"
                            color="primary"
                            endIcon={<CloudDownloadIcon />}
                        >
                            {i18n.t("Download {{itemName}}", { itemName })}
                        </Button>
                    </Box>
                ) : null}
            </NoticeBox>
        </Grid>
    );
}

export function InstallMetadataPackage() {
    const { setupStatuses, setupRequisite, verifyRequisite } = useWmrSetup();

    React.useEffect(() => {
        wmrRequisiteTypes.forEach(type => verifyRequisite(type));
    }, [verifyRequisite]);

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Typography variant="h4" gutterBottom>
                    {i18n.t("Setup WMR prerequisites")}
                </Typography>
            </Grid>
            {wmrRequisiteTypes.map(type => (
                <PrerequisiteItem
                    key={type}
                    type={type}
                    setupStatus={setupStatuses[type]}
                    importFunction={setupRequisite}
                />
            ))}
        </Grid>
    );
}
