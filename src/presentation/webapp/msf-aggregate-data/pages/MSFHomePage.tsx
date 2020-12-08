import { Box, Button, List, makeStyles, Paper, Theme, Typography } from "@material-ui/core";
import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { Period } from "../../../../domain/common/entities/Period";
import i18n from "../../../../locales";
import { isGlobalAdmin } from "../../../../utils/permissions";
import PageHeader from "../../../react/core/components/page-header/PageHeader";
import { PeriodSelectionDialog } from "../../../react/core/components/period-selection-dialog/PeriodSelectionDialog";
import { useAppContext } from "../../../react/core/contexts/AppContext";
import {
    MSFSettings,
    MSFSettingsDialog,
} from "../../../react/msf-aggregate-data/components/msf-Settings/MSFSettingsDialog";
import { executeAggregateData } from "./MSFHomePagePresenter";

export const MSFHomePage: React.FC = () => {
    const classes = useStyles();
    const history = useHistory();
    const { api, compositionRoot } = useAppContext();

    const [syncProgress, setSyncProgress] = useState<string[]>([]);
    const [showPeriodDialog, setShowPeriodDialog] = useState(false);
    const [showMSFSettingsDialog, setShowMSFSettingsDialog] = useState(false);
    const [period, setPeriod] = useState<Period>();

    const [msfSettings, setMsfSettings] = useState<MSFSettings>({
        runAnalytics: "by-sync-rule-settings",
    });
    const [globalAdmin, setGlobalAdmin] = useState(false);

    useEffect(() => {
        isGlobalAdmin(api).then(setGlobalAdmin);
    }, [api]);

    useEffect(() => {
        const isGlobalInstance = !window.location.host.includes("localhost");
        const msfSettings: MSFSettings = isGlobalInstance
            ? { runAnalytics: false }
            : { runAnalytics: "by-sync-rule-settings" };

        setMsfSettings(msfSettings);
    }, []);

    const handleAggregateData = () => {
        executeAggregateData(
            compositionRoot,
            msfSettings,
            progress => setSyncProgress(progress),
            period
        );
    };

    const handleAdvancedSettings = () => {
        setShowPeriodDialog(true);
    };

    const handleMSFSettings = () => {
        setShowMSFSettingsDialog(true);
    };

    const handleGoToDashboard = () => {
        history.push("/dashboard");
    };
    const handleGoToHistory = () => {
        history.push("/history/events");
    };

    const handleCloseAdvancedSettings = () => {
        setShowPeriodDialog(false);
    };

    const handleSaveAdvancedSettings = (period: Period) => {
        setShowPeriodDialog(false);
        setPeriod(period);
    };

    const handleCloseMSFSettings = () => {
        setShowMSFSettingsDialog(false);
    };

    const handleSaveMSFSettings = (msfSettings: MSFSettings) => {
        setShowMSFSettingsDialog(false);
        setMsfSettings(msfSettings);
    };

    return (
        <React.Fragment>
            <PageHeader title={i18n.t("Aggregate Data For HMIS")} />

            <Paper className={classes.root}>
                <Box display="flex" flexDirection="column">
                    <Button
                        onClick={() => handleAggregateData()}
                        variant="contained"
                        color="primary"
                        className={classes.runButton}
                    >
                        {i18n.t("Aggregate Data")}
                    </Button>

                    <Box display="flex" flexGrow={2} justifyContent="center">
                        <Paper className={classes.log}>
                            <List>
                                <Typography variant="h6" gutterBottom>
                                    {i18n.t("Synchronization Progress")}
                                </Typography>
                                {syncProgress.map((trace, index) => (
                                    <Typography key={index}>{trace}</Typography>
                                ))}
                            </List>
                        </Paper>
                    </Box>

                    <Box display="flex" flexDirection="row" justifyContent="space-between">
                        <Box display="flex" flexDirection="row">
                            <Button
                                className={classes.actionButton}
                                onClick={() => handleAdvancedSettings()}
                                variant="contained"
                            >
                                {i18n.t("Advanced Settings")}
                            </Button>
                            {globalAdmin && (
                                <Button
                                    className={classes.actionButton}
                                    onClick={() => handleMSFSettings()}
                                    variant="contained"
                                >
                                    {i18n.t("MSF Settings")}
                                </Button>
                            )}
                        </Box>
                        <Box display="flex" flexDirection="row">
                            {globalAdmin && (
                                <Button
                                    className={classes.actionButton}
                                    onClick={() => handleGoToDashboard()}
                                    variant="contained"
                                >
                                    {i18n.t("Go To Admin Dashboard")}
                                </Button>
                            )}
                            <Button
                                className={classes.actionButton}
                                onClick={() => handleGoToHistory()}
                                variant="contained"
                            >
                                {i18n.t("Go to History")}
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Paper>

            {showPeriodDialog && (
                <PeriodSelectionDialog
                    title={i18n.t("Advanced Settings")}
                    period={period}
                    onClose={handleCloseAdvancedSettings}
                    onSave={handleSaveAdvancedSettings}
                />
            )}

            {showMSFSettingsDialog && (
                <MSFSettingsDialog
                    msfSettings={msfSettings}
                    onClose={handleCloseMSFSettings}
                    onSave={handleSaveMSFSettings}
                />
            )}
        </React.Fragment>
    );
};

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        marginTop: theme.spacing(2),
        padding: theme.spacing(2),
    },
    runButton: {
        margin: "0 auto",
    },
    log: {
        width: "100%",
        margin: theme.spacing(2),
        padding: theme.spacing(4),
        overflow: "auto",
        minHeight: 300,
        maxHeight: 300,
    },
    actionButton: {
        marginLeft: theme.spacing(1),
        marginRight: theme.spacing(1),
    },
}));
