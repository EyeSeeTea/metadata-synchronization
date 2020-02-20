import i18n from "@dhis2/d2-i18n";
import { Fab, Icon, IconButton, makeStyles, Tooltip, Typography } from "@material-ui/core";
import { useD2, useD2Api } from "d2-api";
import { ConfirmationDialog, TableAction, TableColumn, useSnackbar } from "d2-ui-components";
import _ from "lodash";
import React, { ReactNode, useCallback, useMemo, useState } from "react";
import MappingDialog from "../../components/mapping-dialog/MappingDialog";
import MappingWizard from "../../components/mapping-wizard/MappingWizard";
import MetadataTable from "../../components/metadata-table/MetadataTable";
import { D2Model, DataElementModel } from "../../models/d2Model";
import Instance, { MetadataMapping, MetadataMappingDictionary } from "../../models/instance";
import { D2 } from "../../types/d2";
import { MetadataType } from "../../utils/d2";
import { cleanOrgUnitPath } from "../../utils/synchronization";
import { autoMap, buildMapping } from "./utils";

const useStyles = makeStyles({
    iconButton: {
        padding: 0,
        paddingLeft: 8,
        paddingRight: 8,
    },
    instanceDropdown: {
        order: 0,
    },
    actionButtons: {
        order: 10,
        marginRight: 10,
    },
});

export const getInstances = async (d2: D2) => {
    const { objects } = await Instance.list(d2, {}, { paging: false });
    return objects;
};

interface WarningDialog {
    title?: string;
    description?: string;
    action?: () => void;
}

export interface MappingTableProps {
    filterRows?: (rows: MetadataType[]) => MetadataType[];
    models: typeof D2Model[];
    instance: Instance;
    updateInstance: (instance: Instance) => void;
    mapping?: MetadataMappingDictionary;
    onChange?(mapping: MetadataMappingDictionary): void;
}

export default function MappingTable({
    models,
    instance,
    updateInstance,
    filterRows,
}: MappingTableProps) {
    const d2 = useD2();
    const api = useD2Api();
    const classes = useStyles();
    const snackbar = useSnackbar();

    const [model, setModel] = useState<typeof D2Model>(() => models[0] ?? DataElementModel);
    const type = model.getCollectionName();

    const [isLoading, setLoading] = useState<boolean>(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [warningDialog, setWarningDialog] = useState<WarningDialog | null>(null);
    const [elementsToMap, setElementsToMap] = useState<string[]>([]);
    const [rows, setRows] = useState<MetadataType[]>([]);

    const [relatedMapping, setRelatedMapping] = useState<MetadataMappingDictionary>();

    const applyMapping = useCallback(
        async (selection: string[], mappedId: string | undefined) => {
            if (!instance) {
                snackbar.error(i18n.t("Please select an instance from the dropdown"), {
                    autoHideDuration: 2500,
                });
                return;
            }

            try {
                const newMapping = _.cloneDeep(instance.metadataMapping);
                for (const id of selection) {
                    _.unset(newMapping, [type, id]);
                    if (mappedId) {
                        const mapping = await buildMapping(api, instance, type, id, mappedId);
                        _.set(newMapping, [type, id], mapping);
                    }
                }

                const newInstance = instance.setMetadataMapping(newMapping);
                await newInstance.save(d2 as D2);
                updateInstance(newInstance);
                setSelectedIds([]);

                const action = mappedId ? i18n.t("Set") : i18n.t("Reset to default");
                const operation = mappedId === "DISABLED" ? i18n.t("Disabled") : action;

                snackbar.info(
                    i18n.t("{{operation}} mapping for {{total}} elements", {
                        operation,
                        total: selection.length,
                    }),
                    { autoHideDuration: 2500 }
                );
            } catch (e) {
                console.error(e);
                snackbar.error(i18n.t("Could not apply mapping, please try again."));
            }
        },
        [api, d2, instance, snackbar, type, updateInstance]
    );

    const updateMapping = useCallback(
        async (mappedId?: string) => {
            applyMapping(elementsToMap, mappedId);
        },
        [applyMapping, elementsToMap]
    );

    const disableMapping = useCallback(
        async (selection: string[]) => {
            applyMapping(selection, "DISABLED");
        },
        [applyMapping]
    );

    const resetMapping = useCallback(
        async (selection: string[]) => {
            applyMapping(selection, undefined);
        },
        [applyMapping]
    );

    const applyAutoMapping = useCallback(
        async (selection: string[]) => {
            const selectedItem = _.find(rows, ["id", selection[0]]);

            if (!instance) {
                snackbar.error(i18n.t("Please select an instance from the dropdown"), {
                    autoHideDuration: 2500,
                });
                return;
            } else if (selection.length !== 1) {
                snackbar.error(i18n.t("Auto-mapping does not support multiple action yet"), {
                    autoHideDuration: 2500,
                });
                return;
            } else if (!selectedItem) {
                snackbar.error(i18n.t("Unexpected error, could not apply auto mapping"), {
                    autoHideDuration: 2500,
                });
                return;
            }

            const { mappedId: candidate } = await autoMap(instance, type, selectedItem);
            if (!candidate) {
                snackbar.error(i18n.t("Could not find a suitable candidate to apply auto-mapping"));
            } else {
                await applyMapping(selection, candidate);
                setElementsToMap(selection);
            }
        },
        [applyMapping, instance, rows, snackbar, type]
    );

    const openMappingDialog = useCallback(
        (selection: string[]) => {
            if (!instance) {
                snackbar.error(i18n.t("Please select an instance from the dropdown"), {
                    autoHideDuration: 2500,
                });
            } else {
                setElementsToMap(selection);
                setSelectedIds([]);
            }
        },
        [instance, snackbar]
    );

    const openRelatedMapping = useCallback(
        (selection: string[]) => {
            const id = _.first(selection);
            if (!id) return;

            const { mapping } = instance.metadataMapping[type][id] ?? {};

            if (!mapping)
                snackbar.error(
                    "You need to map this element before accessing related metdata mapping"
                );

            setRelatedMapping(mapping);
        },
        [instance, type, snackbar]
    );

    const columns: TableColumn<MetadataType>[] = useMemo(
        () => [
            {
                name: "id",
                text: "ID",
            },
            {
                name: "mapped-id",
                text: "Mapped ID",
                getValue: (row: MetadataType) => {
                    const mappedId = _.get(
                        instance?.metadataMapping,
                        [type, row.id, "mappedId"],
                        row.id
                    );
                    const cleanId = cleanOrgUnitPath(mappedId);
                    const name = cleanId === "DISABLED" ? i18n.t("Disabled") : cleanId;

                    return (
                        <span>
                            <Typography variant={"inherit"} gutterBottom>
                                {name}
                            </Typography>
                            <Tooltip title={i18n.t("Set mapping")} placement="top">
                                <IconButton
                                    className={classes.iconButton}
                                    onClick={() => openMappingDialog([row.id])}
                                >
                                    <Icon color="primary">open_in_new</Icon>
                                </IconButton>
                            </Tooltip>
                        </span>
                    );
                },
            },
            {
                name: "mapped-name",
                text: "Mapped Name",
                getValue: (row: MetadataType) => {
                    const {
                        mappedId = row.id,
                        name = mappedId === "DISABLED" ? undefined : i18n.t("Not mapped"),
                        conflicts = false,
                    }: Partial<MetadataMapping> =
                        _.get(instance?.metadataMapping, [type, row.id]) ?? {};

                    return (
                        <span>
                            <Typography variant={"inherit"} gutterBottom>
                                {name ?? "-"}
                            </Typography>
                            {conflicts && (
                                <Tooltip title={i18n.t("Mapping has errors")} placement="top">
                                    <IconButton className={classes.iconButton} onClick={_.noop}>
                                        <Icon color="error">warning</Icon>
                                    </IconButton>
                                </Tooltip>
                            )}
                        </span>
                    );
                },
            },
        ],
        [classes, type, instance, openMappingDialog]
    );

    const filters: ReactNode = useMemo(
        () => (
            <React.Fragment>
                <Fab
                    className={classes.actionButtons}
                    color="primary"
                    onClick={() => resetMapping(rows.map(({ id }) => id))}
                    variant={"extended"}
                >
                    {i18n.t("Reset mapping")}
                </Fab>
                <Fab
                    className={classes.actionButtons}
                    color="primary"
                    onClick={() => disableMapping(rows.map(({ id }) => id))}
                    variant={"extended"}
                >
                    {i18n.t("Disable mapping")}
                </Fab>
            </React.Fragment>
        ),
        [classes, rows, disableMapping, resetMapping]
    );

    const actions: TableAction<MetadataType>[] = useMemo(
        () => [
            {
                // Required to disable default "select" action
                name: "select",
                text: "Select",
                isActive: () => false,
            },
            {
                name: "set-mapping",
                text: i18n.t("Set mapping"),
                multiple: false,
                onClick: openMappingDialog,
                icon: <Icon>open_in_new</Icon>,
            },
            {
                name: "auto-mapping",
                text: i18n.t("Auto-map element"),
                // To make this action multiple, we need cancellable model "save" operation
                // Race conditions lead to unwanted bugs
                multiple: false,
                onClick: applyAutoMapping,
                icon: <Icon>compare_arrows</Icon>,
            },
            {
                name: "disable-mapping",
                text: i18n.t("Disable mapping"),
                multiple: true,
                onClick: disableMapping,
                icon: <Icon>sync_disabled</Icon>,
                isActive: () => type === "dataElements" || type === "organisationUnits",
            },
            {
                name: "reset-mapping",
                text: i18n.t("Reset mapping to default values"),
                multiple: true,
                onClick: resetMapping,
                icon: <Icon>clear</Icon>,
            },
            {
                name: "related-mapping",
                text: i18n.t("Related metadata mapping"),
                multiple: false,
                onClick: openRelatedMapping,
                icon: <Icon>assignment</Icon>,
            },
        ],
        [
            disableMapping,
            openMappingDialog,
            resetMapping,
            applyAutoMapping,
            openRelatedMapping,
            type,
        ]
    );

    const notifyNewModel = useCallback(
        model => {
            setLoading(!!instance);
            setRows([]);
            setSelectedIds([]);
            setModel(() => model);
        },
        [instance]
    );

    return (
        <React.Fragment>
            {!!warningDialog && (
                <ConfirmationDialog
                    open={true}
                    title={warningDialog.title}
                    description={warningDialog.description}
                    saveText={i18n.t("Ok")}
                    onSave={() => {
                        if (warningDialog.action) warningDialog.action();
                        setWarningDialog(null);
                    }}
                    onCancel={() => setWarningDialog(null)}
                />
            )}

            {!!instance && elementsToMap.length > 0 && (
                <MappingDialog
                    rows={rows}
                    model={model}
                    elements={elementsToMap}
                    onUpdateMapping={updateMapping}
                    onClose={() => setElementsToMap([])}
                    instance={instance}
                />
            )}

            {relatedMapping && (
                <MappingWizard
                    mapping={relatedMapping}
                    onCancel={() => setRelatedMapping(undefined)}
                    instance={instance}
                    updateInstance={updateInstance}
                />
            )}

            <MetadataTable
                models={models}
                filterRows={filterRows}
                additionalColumns={columns}
                additionalFilters={filters}
                additionalActions={actions}
                notifyNewModel={notifyNewModel}
                notifyRowsChange={setRows}
                loading={isLoading}
                selectedIds={selectedIds}
                notifyNewSelection={setSelectedIds}
            />
        </React.Fragment>
    );
}
