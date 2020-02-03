import i18n from "@dhis2/d2-i18n";
import { Button, LinearProgress, makeStyles } from "@material-ui/core";
import { useD2, useD2Api } from "d2-api";
import { ConfirmationDialog, useLoading, useSnackbar } from "d2-ui-components";
import _ from "lodash";
import moment from "moment";
import React, { useEffect, useState } from "react";
import { AggregatedSync } from "../../../logic/sync/aggregated";
import { EventsSync } from "../../../logic/sync/events";
import { MetadataSync } from "../../../logic/sync/metadata";
import { getBaseUrl } from "../../../utils/d2";
import {
    availablePeriods,
    cleanOrgUnitPaths,
    getMetadata,
    requestJSONDownload,
} from "../../../utils/synchronization";
import { getValidationMessages } from "../../../utils/validations";
import { getInstanceOptions } from "./InstanceSelectionStep";

const LiEntry = ({ label, value, children }) => {
    return (
        <li key={label}>
            {label}
            {value || children ? ": " : ""}
            {value}
            {children}
        </li>
    );
};

const useStyles = makeStyles({
    saveButton: {
        margin: 10,
        backgroundColor: "#2b98f0",
        color: "white",
    },
    buttonContainer: {
        display: "flex",
        justifyContent: "space-between",
    },
});

const config = {
    metadata: {
        SyncClass: MetadataSync,
    },
    aggregated: {
        SyncClass: AggregatedSync,
    },
    events: {
        SyncClass: EventsSync,
    },
};

const SaveStep = ({ syncRule, onCancel }) => {
    const d2 = useD2();
    const api = useD2Api();
    const snackbar = useSnackbar();
    const loading = useLoading();
    const classes = useStyles();

    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [metadata, updateMetadata] = useState({});
    const [instanceOptions, setInstanceOptions] = useState([]);

    const openCancelDialog = () => setCancelDialogOpen(true);

    const closeCancelDialog = () => setCancelDialogOpen(false);

    const name = syncRule.isOnDemand()
        ? `Rule generated on ${moment().format("YYYY-MM-DD HH:mm:ss")}`
        : syncRule.name;

    const save = async () => {
        setIsSaving(true);

        const errors = await getValidationMessages(d2, syncRule);
        if (errors.length > 0) {
            snackbar.error(errors.join("\n"));
        } else {
            await syncRule.updateName(name).save(d2);
            onCancel();
        }

        setIsSaving(false);
    };

    const downloadJSON = async () => {
        const { SyncClass } = config[syncRule.type];

        loading.show(true, "Generating JSON file");
        requestJSONDownload(SyncClass, syncRule, d2, api);
        loading.reset();
    };

    useEffect(() => {
        const ids = [
            ...syncRule.metadataIds,
            ...syncRule.excludedIds,
            ...syncRule.dataSyncAttributeCategoryOptions,
            ...cleanOrgUnitPaths(syncRule.dataSyncOrgUnitPaths),
        ];
        getMetadata(getBaseUrl(d2), ids, "id,name").then(updateMetadata);
        getInstanceOptions(d2).then(setInstanceOptions);
    }, [d2, syncRule]);

    return (
        <React.Fragment>
            <ConfirmationDialog
                isOpen={cancelDialogOpen}
                onSave={onCancel}
                onCancel={closeCancelDialog}
                title={i18n.t("Cancel synchronization rule wizard")}
                description={i18n.t(
                    "You are about to exit the Sync Rule Creation Wizard. All your changes will be lost. Are you sure you want to proceed?"
                )}
                saveText={i18n.t("Yes")}
            />

            <ul>
                <LiEntry label={i18n.t("Name")} value={name} />

                <LiEntry label={i18n.t("Code")} value={syncRule.code} />

                <LiEntry label={i18n.t("Description")} value={syncRule.description} />

                {_.keys(metadata).map(metadataType => {
                    const items = metadata[metadataType].filter(
                        ({ id }) => !syncRule.excludedIds.includes(id)
                    );
                    return (
                        items.length > 0 && (
                            <LiEntry
                                key={metadataType}
                                label={`${d2.models[metadataType].displayName} [${items.length}]`}
                            >
                                <ul>
                                    {items.map(({ id, name }) => (
                                        <LiEntry key={id} label={`${name} (${id})`} />
                                    ))}
                                </ul>
                            </LiEntry>
                        )
                    );
                })}

                {syncRule.excludedIds.length > 0 && (
                    <LiEntry
                        label={`${i18n.t("Excluded elements")} [${syncRule.excludedIds.length}]`}
                    >
                        <ul>
                            {syncRule.excludedIds.map(id => {
                                const element = _(metadata)
                                    .values()
                                    .flatten()
                                    .find({ id });

                                return (
                                    <LiEntry
                                        key={id}
                                        label={element ? `${element.name} (${id})` : id}
                                    />
                                );
                            })}
                        </ul>
                    </LiEntry>
                )}

                {syncRule.type === "events" && (
                    <LiEntry
                        label={i18n.t("Events")}
                        value={
                            syncRule.dataSyncAllEvents
                                ? i18n.t("All events")
                                : i18n.t("{{total}} selected events", {
                                      total: syncRule.dataSyncEvents.length,
                                  })
                        }
                    />
                )}

                {syncRule.dataSyncAllAttributeCategoryOptions && (
                    <LiEntry
                        label={i18n.t("Category Option Combo")}
                        value={i18n.t("All attribute category options")}
                    />
                )}

                {syncRule.type !== "metadata" && (
                    <LiEntry
                        label={i18n.t("Period")}
                        value={availablePeriods[syncRule.dataSyncPeriod]?.name}
                    >
                        {syncRule.dataSyncPeriod === "FIXED" && (
                            <ul>
                                <LiEntry
                                    label={i18n.t("Start date")}
                                    value={moment(syncRule.dataSyncStartDate).format("YYYY-MM-DD")}
                                />
                            </ul>
                        )}
                        {syncRule.dataSyncPeriod === "FIXED" && (
                            <ul>
                                <LiEntry
                                    label={i18n.t("End date")}
                                    value={moment(syncRule.dataSyncEndDate).format("YYYY-MM-DD")}
                                />
                            </ul>
                        )}
                    </LiEntry>
                )}

                <LiEntry
                    label={i18n.t("Target instances [{{total}}]", {
                        total: syncRule.targetInstances.length,
                    })}
                >
                    <ul>
                        {syncRule.targetInstances.map(id => {
                            const instance = instanceOptions.find(e => e.value === id);
                            return instance ? (
                                <LiEntry key={instance.value} label={instance.text} />
                            ) : null;
                        })}
                    </ul>
                </LiEntry>

                {syncRule.type === "metadata" && (
                    <LiEntry label={i18n.t("Advanced options")}>
                        <ul>
                            <LiEntry
                                label={i18n.t("Include user information and sharing settings")}
                                value={
                                    syncRule.syncParams.includeSharingSettings
                                        ? i18n.t("Yes")
                                        : i18n.t("No")
                                }
                            />
                        </ul>
                        <ul>
                            <LiEntry
                                label={i18n.t("Disable atomic verification")}
                                value={
                                    syncRule.syncParams.atomicMode === "NONE"
                                        ? i18n.t("Yes")
                                        : i18n.t("No")
                                }
                            />
                        </ul>
                        <ul>
                            <LiEntry
                                label={i18n.t("Replace objects in destination instance")}
                                value={
                                    syncRule.syncParams.mergeMode === "REPLACE"
                                        ? i18n.t("Yes")
                                        : i18n.t("No")
                                }
                            />
                        </ul>
                    </LiEntry>
                )}

                <LiEntry
                    label={i18n.t("Scheduling")}
                    value={syncRule.enabled ? i18n.t("Enabled") : i18n.t("Disabled")}
                />

                {syncRule.longFrequency && (
                    <LiEntry label={i18n.t("Frequency")} value={syncRule.longFrequency} />
                )}
            </ul>

            <div className={classes.buttonContainer}>
                <div>
                    {!syncRule.isOnDemand() && (
                        <Button onClick={openCancelDialog} variant="contained">
                            {i18n.t("Cancel")}
                        </Button>
                    )}
                    <Button className={classes.saveButton} onClick={save} variant="contained">
                        {syncRule.isOnDemand() ? i18n.t("Save as sync Rule") : i18n.t("Save")}
                    </Button>
                </div>
                <div>
                    <Button onClick={downloadJSON} variant="contained">
                        {i18n.t("Download JSON")}
                    </Button>
                </div>
            </div>

            {isSaving && <LinearProgress />}
        </React.Fragment>
    );
};

export default SaveStep;
