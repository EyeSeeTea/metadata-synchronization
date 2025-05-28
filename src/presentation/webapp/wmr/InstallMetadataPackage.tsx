import { Box, Button, CircularProgress, Grid, Typography } from "@material-ui/core";
import {
    CloudDownload as CloudDownloadIcon,
    CloudUpload as CloudUploadIcon,
    Check as CheckIcon,
    ErrorOutline as ErrorOutlineIcon,
    InfoOutlined as InfoOutlinedIcon,
} from "@material-ui/icons";
import _ from "lodash";
import React from "react";
import { WmrRequisiteType } from "../../../domain/entities/wmr/entities/WmrRequisite";
import i18n from "../../../utils/i18n";
import { muiTheme } from "../../react/core/themes/dhis2.theme";
import { useWmrSetup, WmrSetupStatusType } from "./hooks/useWmrSetup";

const colorByStatus: Record<WmrSetupStatusType, string> = {
    loading: muiTheme.palette.primary.main,
    uploading: muiTheme.palette.info.main,
    done: muiTheme.palette.success.main,
    error: muiTheme.palette.error.main,
    pending: muiTheme.palette.warning.main,
};

function IconByStatus({ status }: { status: WmrSetupStatusType }) {
    const DEFAULT_SIZE = 24;
    switch (status) {
        case "loading":
        case "uploading":
            return <CircularProgress size={DEFAULT_SIZE} />;
        case "done":
            return <CheckIcon height={DEFAULT_SIZE} width={DEFAULT_SIZE} htmlColor={colorByStatus[status]} />;
        case "error":
            return <ErrorOutlineIcon height={DEFAULT_SIZE} width={DEFAULT_SIZE} htmlColor={colorByStatus[status]} />;
        case "pending":
            return <InfoOutlinedIcon height={DEFAULT_SIZE} width={DEFAULT_SIZE} htmlColor={colorByStatus[status]} />;
        default:
            return <InfoOutlinedIcon height={DEFAULT_SIZE} width={DEFAULT_SIZE} htmlColor={colorByStatus[status]} />;
    }
}

function PrerequisiteItem({
    type,
    status,
    downloadUrl,
    importFunction,
}: {
    type: WmrRequisiteType;
    status: WmrSetupStatusType;
    downloadUrl: string;
    importFunction: (type: WmrRequisiteType) => void;
}) {
    const itemName = type === "metadata" ? "metadata package" : "Autogenform configuration";
    const messagesByStatus: Record<WmrSetupStatusType, string> = {
        loading: i18n.t("Checking {{itemName}}...", { itemName }),
        uploading: i18n.t("Uploading {{itemName}}...", { itemName }),
        done: i18n.t("The {{itemName}} is already installed.", { itemName }),
        error: i18n.t(
            "An error occurred while installing the {{itemName}}. Alternatively, you can download the configuration and import it manually",
            { itemName }
        ),
        pending: i18n.t("The {{itemName}} is not installed yet. Use the button below to install it.", { itemName }),
    };
    return (
        <Box
            display="flex"
            flexDirection="row"
            alignItems="center"
            style={{ marginTop: "1rem", borderLeft: `4px solid ${colorByStatus[status]}` }}
        >
            <Box pl={2}>
                <IconByStatus status={status} />
            </Box>
            <Box flexDirection="column" display="flex" pl={2} flexGrow>
                <Typography>{messagesByStatus[status]}</Typography>
                {status === "pending" ? (
                    <Box py={2}>
                        <Button
                            onClick={() => importFunction(type)}
                            variant="contained"
                            color="primary"
                            endIcon={<CloudUploadIcon />}
                        >
                            {i18n.t(`Setup ${itemName}`)}
                        </Button>
                    </Box>
                ) : status === "error" ? (
                    <Box py={2}>
                        <Button
                            download={`${_.snakeCase(itemName)}.json`}
                            href={downloadUrl}
                            variant="contained"
                            color="primary"
                            endIcon={<CloudDownloadIcon />}
                        >
                            {i18n.t(`Download ${itemName}`)}
                        </Button>
                    </Box>
                ) : null}
            </Box>
        </Box>
    );
}

export function InstallMetadataPackage() {
    const { setupStatuses, setupRequisite, verifyRequisite } = useWmrSetup();

    React.useEffect(() => {
        verifyRequisite("metadata");
        verifyRequisite("dataStore");
    }, [verifyRequisite]);

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Typography variant="h4" gutterBottom>
                    {i18n.t("Setup WMR prerequisites")}
                </Typography>
            </Grid>
            <Grid item xs={12}>
                <Typography variant="h5" gutterBottom>
                    {i18n.t("Metadata package")}
                </Typography>
                <Typography variant="caption" gutterBottom>
                    {i18n.t("This package contains the WMR dataset and its dependencies")}
                </Typography>
                <PrerequisiteItem
                    type="metadata"
                    status={setupStatuses.metadata.status}
                    downloadUrl="wmr/metadata.json"
                    importFunction={setupRequisite}
                />
            </Grid>
            <Grid item xs={12}>
                <Typography variant="h5" gutterBottom>
                    {i18n.t("Autogenform configuration")}
                </Typography>
                <Typography variant="caption" gutterBottom>
                    {i18n.t("Contains the dataStore configurations required by the autogenforms tool")}
                </Typography>
                <PrerequisiteItem
                    type="dataStore"
                    status={setupStatuses.dataStore.status}
                    downloadUrl="wmr/dataStore.json"
                    importFunction={setupRequisite}
                />
            </Grid>
        </Grid>
    );
}
