import { Icon } from "@material-ui/core";
import {
    ConfirmationDialog,
    ConfirmationDialogProps,
    MetaObject,
    ObjectsTable,
    ObjectsTableDetailField,
    SearchResult,
    ShareUpdate,
    TableAction,
    TableColumn,
    TableSelection,
    TableState,
    useLoading,
    useSnackbar,
} from "d2-ui-components";
import _ from "lodash";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import { Module } from "../../../../domain/modules/entities/Module";
import { Package } from "../../../../domain/packages/entities/Package";
import i18n from "../../../../locales";
import { promiseMap } from "../../../../utils/common";
import Dropdown from "../../../webapp/components/dropdown/Dropdown";
import {
    PullRequestCreation,
    PullRequestCreationDialog,
} from "../../../webapp/components/pull-request-creation-dialog/PullRequestCreationDialog";
import { SharingDialog } from "../../../webapp/components/sharing-dialog/SharingDialog";
import { ModulePackageListPageProps } from "../../../webapp/pages/module-package-list/ModulePackageListPage";
import { useAppContext } from "../../contexts/AppContext";
import { NewPackageDialog } from "./NewPackageDialog";
import { getValidationsByVersionFeedback } from "./utils";

export const ModulesListTable: React.FC<ModulePackageListPageProps> = ({
    remoteInstance,
    onActionButtonClick,
    presentation = "app",
    externalComponents,
    openSyncSummary = _.noop,
    paginationOptions,
}) => {
    const { compositionRoot, api } = useAppContext();
    const snackbar = useSnackbar();
    const loading = useLoading();
    const history = useHistory();

    const [rows, setRows] = useState<Module[]>([]);
    const [selection, updateSelection] = useState<TableSelection[]>([]);

    const [resetKey, setResetKey] = useState(Math.random());
    const [isTableLoading, setIsTableLoading] = useState(false);
    const [newPackageModule, setNewPackageModule] = useState<Module>();
    const [sharingSettingsObject, setSharingSettingsObject] = useState<MetaObject | null>(null);
    const [pullRequestProps, setPullRequestProps] = useState<PullRequestCreation>();
    const [dialogProps, updateDialog] = useState<ConfirmationDialogProps | null>(null);
    const [departmentFilter, setDepartmentFilter] = useState("");

    const editModule = useCallback(
        (ids: string[]) => {
            const item = _.find(rows, ({ id }) => id === ids[0]);
            if (!item) snackbar.error(i18n.t("Invalid module"));
            else history.push({ pathname: `/modules/edit/${item.id}`, state: { module: item } });
        },
        [rows, history, snackbar]
    );

    const downloadSnapshot = useCallback(
        async (ids: string[]) => {
            const module = _.find(rows, ({ id }) => id === ids[0]);
            if (!module) snackbar.error(i18n.t("Invalid module"));
            else {
                loading.show(true, i18n.t("Downloading snapshot for module {{name}}", module));

                const originInstance = remoteInstance?.id ?? "LOCAL";
                const contents = await compositionRoot.sync[module.type]({
                    ...module.toSyncBuilder(),
                    originInstance,
                    targetInstances: [],
                }).buildPayload();

                await compositionRoot.modules.download(module, contents);
                loading.reset();
            }
        },
        [compositionRoot, remoteInstance, rows, snackbar, loading]
    );

    const createPackage = useCallback(
        async (ids: string[]) => {
            const module = _.find(rows, ({ id }) => id === ids[0]);
            if (!module) snackbar.error(i18n.t("Invalid module"));
            else setNewPackageModule(module);
        },
        [rows, snackbar]
    );

    const savePackage = useCallback(
        async (item: Package, versions: string[]) => {
            setNewPackageModule(undefined);
            const module = _.find(rows, ({ id }) => id === item.module.id);
            if (!module) snackbar.error(i18n.t("Invalid module"));
            else {
                const validationsByVersion = _.fromPairs(
                    await promiseMap(versions, async dhisVersion => {
                        loading.show(
                            true,
                            i18n.t("Creating {{dhisVersion}} package for module {{name}}", {
                                name: module.name,
                                dhisVersion,
                            })
                        );

                        const validations = await compositionRoot.packages.create(
                            remoteInstance?.id ?? "LOCAL",
                            item,
                            module,
                            dhisVersion
                        );

                        return [dhisVersion, validations];
                    })
                );

                const [level, msg] = getValidationsByVersionFeedback(module, validationsByVersion);
                snackbar.openSnackbar(level, msg);

                loading.reset();
                setResetKey(Math.random());
            }
        },
        [compositionRoot, remoteInstance, rows, snackbar, loading]
    );

    const pullModule = useCallback(
        async (ids: string[]) => {
            const module = _.find(rows, ({ id }) => id === ids[0]);
            if (!module) snackbar.error(i18n.t("Invalid module"));
            else {
                loading.show(true, i18n.t("Pulling metadata from module {{name}}", module));

                const originInstance = remoteInstance?.id ?? "LOCAL";
                const builder = {
                    ...module.toSyncBuilder(),
                    originInstance,
                    targetInstances: ["LOCAL"],
                };

                const result = await compositionRoot.sync.prepare(module.type, builder);
                const sync = compositionRoot.sync[module.type](builder);

                const createPullRequest = () => {
                    if (!remoteInstance) {
                        snackbar.error(i18n.t("Unable to create pull request"));
                    } else {
                        setPullRequestProps({
                            instance: remoteInstance,
                            builder,
                            type: module.type,
                        });
                    }
                };

                const synchronize = async () => {
                    for await (const { message, syncReport, done } of sync.execute()) {
                        if (message) loading.show(true, message);
                        if (syncReport) await syncReport.save(api);
                        if (done) {
                            openSyncSummary(syncReport);
                            return;
                        }
                    }
                };

                await result.match({
                    success: async () => {
                        await synchronize();
                    },
                    error: async code => {
                        switch (code) {
                            case "PULL_REQUEST":
                                createPullRequest();
                                break;
                            case "PULL_REQUEST_RESPONSIBLE":
                                updateDialog({
                                    title: i18n.t("Pull metadata"),
                                    description: i18n.t(
                                        "You are one of the reponsibles for the selected items.\nDo you want to directly pull the metadata?"
                                    ),
                                    onCancel: () => {
                                        updateDialog(null);
                                    },
                                    onSave: async () => {
                                        updateDialog(null);
                                        await synchronize();
                                    },
                                    onInfoAction: () => {
                                        updateDialog(null);
                                        createPullRequest();
                                    },
                                    cancelText: i18n.t("Cancel"),
                                    saveText: i18n.t("Proceed"),
                                    infoActionText: i18n.t("Create pull request"),
                                });
                                break;
                            default:
                                snackbar.error(i18n.t("Unknown synchronization error"));
                        }
                    },
                });

                loading.reset();
            }
        },
        [compositionRoot, openSyncSummary, remoteInstance, loading, rows, snackbar, api]
    );

    const replicateModule = useCallback(
        async (ids: string[]) => {
            const item = _.find(rows, ({ id }) => id === ids[0]);
            if (!item) {
                snackbar.error(i18n.t("Invalid module"));
                return;
            }

            history.push({
                pathname: `/modules/new`,
                state: { module: item.replicate() },
            });
        },
        [history, rows, snackbar]
    );

    const deleteModule = useCallback(
        async (ids: string[]) => {
            loading.show(true, "Deleting modules");
            for (const id of ids) {
                await compositionRoot.modules.delete(id);
            }
            loading.reset();
            setResetKey(Math.random());
            updateSelection([]);
        },
        [compositionRoot, loading]
    );

    const openSharingSettings = useCallback(
        async (ids: string[]) => {
            const item = _.find(rows, ({ id }) => id === ids[0]);
            if (!item) {
                snackbar.error(i18n.t("Invalid module"));
                return;
            }

            setSharingSettingsObject({
                object: item,
                meta: { allowPublicAccess: true, allowExternalAccess: false },
            });
        },
        [rows, snackbar]
    );

    const updateTable = useCallback(
        ({ selection }: TableState<Module>) => {
            updateSelection(selection);
        },
        [updateSelection]
    );

    const columns: TableColumn<Module>[] = useMemo(
        () => [
            { name: "name", text: i18n.t("Name"), sortable: true },
            {
                name: "department",
                text: i18n.t("Department"),
                sortable: true,
                getValue: ({ department }) => {
                    return department.name;
                },
            },
            { name: "description", text: i18n.t("Description"), sortable: true, hidden: true },
            {
                name: "metadataIds",
                text: "Selected metadata",
                getValue: module => `${module.metadataIds.length} elements`,
            },
            { name: "lastUpdated", text: i18n.t("Last updated"), hidden: true },
            { name: "lastUpdatedBy", text: i18n.t("Last updated by"), hidden: true },
            { name: "created", text: i18n.t("Created"), hidden: true },
            { name: "user", text: i18n.t("Created by"), hidden: true },
        ],
        []
    );

    const details: ObjectsTableDetailField<Module>[] = useMemo(
        () => [
            { name: "name", text: i18n.t("Name") },
            {
                name: "department",
                text: i18n.t("Department"),
                getValue: ({ department }) => {
                    return department.name;
                },
            },
            { name: "description", text: i18n.t("Description") },
            {
                name: "metadataIds",
                text: i18n.t("Selected metadata"),
                getValue: module => `${module.metadataIds.length} elements`,
            },
            { name: "lastUpdated", text: i18n.t("Last updated") },
            { name: "lastUpdatedBy", text: i18n.t("Last updated by") },
            { name: "created", text: i18n.t("Created") },
            { name: "user", text: i18n.t("Created by") },
        ],
        []
    );

    const actions: TableAction<Module>[] = useMemo(
        () => [
            {
                name: "details",
                text: i18n.t("Details"),
                multiple: false,
                primary: presentation !== "app" && !remoteInstance,
            },
            {
                name: "edit",
                text: i18n.t("Edit"),
                multiple: false,
                isActive: () => presentation === "app" && !remoteInstance,
                onClick: editModule,
                primary: presentation === "app" && !remoteInstance,
                icon: <Icon>edit</Icon>,
            },
            {
                name: "delete",
                text: i18n.t("Delete"),
                multiple: true,
                isActive: () => presentation === "app" && !remoteInstance,
                onClick: deleteModule,
                icon: <Icon>delete</Icon>,
            },
            {
                name: "replicate",
                text: i18n.t("Replicate"),
                multiple: false,
                onClick: replicateModule,
                icon: <Icon>content_copy</Icon>,
                isActive: () => presentation === "app" && !remoteInstance,
            },
            {
                name: "download",
                text: i18n.t("Download metadata package"),
                multiple: false,
                onClick: downloadSnapshot,
                icon: <Icon>cloud_download</Icon>,
            },
            {
                name: "package-data-store",
                text: i18n.t("Generate package from module"),
                multiple: false,
                icon: <Icon>description</Icon>,
                isActive: () => presentation === "app" && !remoteInstance,
                onClick: createPackage,
            },
            {
                name: "pull-metadata",
                text: i18n.t("Pull metadata"),
                multiple: false,
                icon: <Icon>arrow_downward</Icon>,
                isActive: () => presentation === "app" && !!remoteInstance,
                onClick: pullModule,
            },
            {
                name: "sharingSettings",
                text: i18n.t("Sharing settings"),
                multiple: false,
                // TODO: isActive: verifyUserCanEditSharingSettings,
                onClick: openSharingSettings,
                icon: <Icon>share</Icon>,
            },
        ],
        [
            createPackage,
            deleteModule,
            downloadSnapshot,
            editModule,
            openSharingSettings,
            presentation,
            pullModule,
            remoteInstance,
            replicateModule,
        ]
    );

    const departmentFilterItems = useMemo(() => {
        return _(rows)
            .map(({ department }) => department)
            .uniqBy(({ id }) => id)
            .sortBy(({ name }) => name)
            .value();
    }, [rows]);

    const filterComponents = React.useMemo(() => {
        const departmentFilterComponent = (
            <Dropdown
                key="filter-department"
                items={departmentFilterItems}
                onValueChange={setDepartmentFilter}
                value={departmentFilter}
                label={i18n.t("Department")}
            />
        );

        return [externalComponents, departmentFilterComponent];
    }, [externalComponents, departmentFilter, departmentFilterItems]);

    const rowsFiltered = useMemo(() => {
        return departmentFilter
            ? rows.filter(({ department }) => department.id === departmentFilter)
            : rows;
    }, [departmentFilter, rows]);

    const onSearchRequest = async (key: string) =>
        api
            .get<SearchResult>("/sharing/search", { key })
            .getData();

    const onSharingChanged = async (updatedAttributes: ShareUpdate) => {
        if (!sharingSettingsObject) return;

        const newSharingSettings = {
            meta: sharingSettingsObject.meta,
            object: {
                ...sharingSettingsObject.object,
                ...updatedAttributes,
            },
        };

        // TODO: Persist object

        setSharingSettingsObject(newSharingSettings);
    };

    useEffect(() => {
        setIsTableLoading(true);
        compositionRoot.modules
            .list(remoteInstance)
            .then(rows => {
                setRows(rows);
                setIsTableLoading(false);
            })
            .catch((error: Error) => {
                snackbar.error(error.message);
                setRows([]);
                setIsTableLoading(false);
            });
    }, [compositionRoot, remoteInstance, resetKey, snackbar, setIsTableLoading]);

    useEffect(() => {
        setDepartmentFilter("");
    }, [remoteInstance]);

    return (
        <React.Fragment>
            <ObjectsTable<Module>
                rows={rowsFiltered}
                loading={isTableLoading}
                columns={columns}
                details={details}
                actions={actions}
                onActionButtonClick={onActionButtonClick}
                forceSelectionColumn={presentation === "app"}
                filterComponents={filterComponents}
                selection={selection}
                onChange={updateTable}
                paginationOptions={paginationOptions}
            />

            {!!newPackageModule && (
                <NewPackageDialog
                    save={savePackage}
                    close={() => setNewPackageModule(undefined)}
                    module={newPackageModule}
                />
            )}

            {!!pullRequestProps && (
                <PullRequestCreationDialog
                    {...pullRequestProps}
                    onClose={() => setPullRequestProps(undefined)}
                />
            )}

            {!!sharingSettingsObject && (
                <SharingDialog
                    isOpen={true}
                    showOptions={{
                        title: false,
                        dataSharing: false,
                    }}
                    title={i18n.t("Sharing settings for {{name}}", sharingSettingsObject.object)}
                    meta={sharingSettingsObject}
                    onCancel={() => setSharingSettingsObject(null)}
                    onChange={onSharingChanged}
                    onSearch={onSearchRequest}
                />
            )}

            {dialogProps && <ConfirmationDialog isOpen={true} maxWidth={"xl"} {...dialogProps} />}
        </React.Fragment>
    );
};
