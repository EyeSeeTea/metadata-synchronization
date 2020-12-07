import i18n from "../../../../../locales";
import MetadataDropZone from "../metadata-drop-zone/MetadataDropZone";
import { MetadataPackage } from "../../../../../domain/metadata/entities/MetadataEntities";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    makeStyles,
    TextField,
} from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import { useLoading, useSnackbar } from "d2-ui-components";
import _ from "lodash";
import React, { useCallback, useEffect, useState } from "react";
import semver from "semver";
import { ValidationError } from "../../../../../domain/common/entities/Validations";
import { Package } from "../../../../../domain/packages/entities/Package";
import { Dictionary } from "../../../../../types/utils";
import { useAppContext } from "../../contexts/AppContext";
import { MetadataModule } from "../../../../../domain/modules/entities/MetadataModule";
import { promiseMap } from "../../../../../utils/common";
import { getValidationsByVersionFeedback } from "../module-list-table/utils";
import { NamedRef } from "../../../../../domain/common/entities/Ref";
import Dropdown from "../dropdown/Dropdown";
import { Module } from "../../../../../domain/modules/entities/Module";

interface CreatePackageFromFileDialogProps {
    onClose: () => void;
    onSaved?: () => void;
    onImport?: (packakeId: string) => void;
}

export const CreatePackageFromFileDialog: React.FC<CreatePackageFromFileDialogProps> = ({
    onClose,
    onSaved,
    onImport,
}) => {
    const { compositionRoot } = useAppContext();
    const loading = useLoading();
    const snackbar = useSnackbar();
    const classes = useStyles();

    const [versions, updateVersions] = useState<string[]>([]);
    const [module, setModule] = useState<Module>(MetadataModule.build({ autogenerated: true }));

    const [newPackage, setNewPackage] = useState<Package>(
        Package.build({
            name: "",
            module,
            version: "1.0.0",
        })
    );
    const [userGroups, setUserGroups] = useState<NamedRef[]>([]);
    const [contents, setContents] = useState<MetadataPackage>();

    const [errors, setErrors] = useState<Dictionary<ValidationError>>({});

    useEffect(() => {
        compositionRoot.instances.getVersion().then(version => {
            if (versions.length === 0) updateVersions([version]);
        });
    }, [compositionRoot, versions, updateVersions]);

    useEffect(() => {
        compositionRoot.instances.getUserGroups().then(setUserGroups);
    }, [compositionRoot]);

    const updateModel = useCallback(
        (field: keyof Package, value: string) => {
            const pkg = newPackage.update({ [field]: value });
            const errors = _.keyBy(pkg.validate([field], module), "property");

            setErrors(errors);
            setNewPackage(pkg);
        },
        [newPackage, module]
    );

    const onChangeField = useCallback(
        (field: keyof Package) => {
            return (event: React.ChangeEvent<{ value: unknown }>) => {
                updateModel(field, event.target.value as string);
            };
        },
        [updateModel]
    );

    const updateVersionNumber = useCallback(
        (event: React.ChangeEvent<{ value: unknown }>) => {
            const revision = event.target.value as string;
            const tag = newPackage.version.split("-")[1];
            const newVersion = [revision, tag].join("-");
            updateModel("version", newVersion);
        },
        [newPackage, updateModel]
    );

    const updateVersionTag = useCallback(
        (event: React.ChangeEvent<{ value: unknown }>) => {
            const revision = newPackage.version.split("-")[0];
            const tag = event.target.value ? (event.target.value as string) : undefined;
            const newVersion = semver.parse([revision, tag].join("-"))?.format();
            updateModel("version", newVersion ?? revision);
        },
        [newPackage, updateModel]
    );

    const saveModuleAndPackage = async () => {
        const moduleErrors = (await compositionRoot.modules.save(module))
            .filter(error => error.property !== "name")
            .map(error =>
                error.property === "metadataIds"
                    ? { ...error, description: i18n.t("An exported dhis2 file is necessary") }
                    : error
            );

        if (moduleErrors.length > 0) {
            snackbar.error(moduleErrors.map(error => error.description).join("\n"));
        } else {
            const savedModule = await compositionRoot.modules.get(module.id);

            if (!savedModule) {
                i18n.t("An error has ocurred to find the autogenerated module");
            } else {
                const validationsByVersion = _.fromPairs(
                    await promiseMap(versions, async dhisVersion => {
                        loading.show(
                            true,
                            i18n.t("Creating {{dhisVersion}} package for module {{name}}", {
                                name: module.name,
                                dhisVersion,
                            })
                        );

                        if (!contents) {
                            snackbar.error(i18n.t("An exported dhis2 file is necessary"));
                        }

                        const validations = await compositionRoot.packages.create(
                            "LOCAL",
                            newPackage.update({ module: savedModule }),
                            savedModule,
                            dhisVersion,
                            contents
                        );

                        return [dhisVersion, validations];
                    })
                );

                const [level, msg] = getValidationsByVersionFeedback(module, validationsByVersion);
                snackbar.openSnackbar(level, msg);

                loading.reset();
                onClose();
            }
        }
    };

    const onSave = async (importAfter: boolean) => {
        i18n.t("Creating autogenerated module");
        const moduleErrors = module
            .validate()
            .filter(error => error.property !== "name")
            .map(error =>
                error.property === "metadataIds"
                    ? { ...error, description: i18n.t("An exported dhis2 file is necessary") }
                    : error
            );

        const errors = [...moduleErrors, ...newPackage.validate(undefined, module)];
        const messages = _.keyBy(errors, "property");

        if (errors.length === 0) {
            await saveModuleAndPackage();

            if (importAfter && onImport) onImport(newPackage.id);
            if (!importAfter && onSaved) onSaved();
        } else {
            snackbar.error(errors.map(error => error.description).join("\n"));
            setErrors(messages);
        }
    };

    const onChangeDepartment = (id: string) => {
        const department = userGroups.find(group => group.id === id);
        const updatedModule = module.update({ department });
        setModule(updatedModule);
        setNewPackage(newPackage.update({ module: updatedModule }));
    };

    const onFileChange = (fileName: string, metadataPackage: MetadataPackage) => {
        const metadataIds: string[] = Object.entries(metadataPackage).reduce(
            (acc: string[], [_key, items]) => {
                const ids: string[] = items ? items.map(item => item.id) : [];
                return [...acc, ...ids];
            },
            []
        );

        const updatedModule = module.update({ name: fileName, metadataIds });
        setModule(updatedModule);
        setNewPackage(newPackage.update({ module: updatedModule }));
        setContents(metadataPackage);
    };

    return (
        <Dialog open={true} onClose={onClose} maxWidth={"sm"} fullWidth={true}>
            <DialogTitle>{i18n.t("Generate package from File")}</DialogTitle>

            <DialogContent>
                <TextField
                    className={classes.row}
                    fullWidth={true}
                    label={i18n.t("Name (*)")}
                    value={newPackage.name ?? ""}
                    onChange={onChangeField("name")}
                    error={!!errors["name"]}
                    helperText={errors["name"]?.description}
                />

                <div className={classes.row}>
                    <Dropdown
                        items={userGroups}
                        label={i18n.t("Department (*)")}
                        value={module.department?.id ?? ""}
                        onValueChange={onChangeDepartment}
                        view={"full-width"}
                    />
                </div>

                <div className={classes.versionRow}>
                    <TextField
                        className={classes.marginRight}
                        fullWidth={true}
                        label={i18n.t("Version number (*)")}
                        value={newPackage.version.split("-")[0] ?? ""}
                        onChange={updateVersionNumber}
                        error={!!errors["version"]}
                        helperText={errors["version"]?.description}
                    />
                    <TextField
                        fullWidth={true}
                        label={i18n.t("Version tag")}
                        value={newPackage.version.split("-")[1] ?? ""}
                        onChange={updateVersionTag}
                    />
                </div>

                <Autocomplete
                    className={classes.row}
                    multiple
                    options={["2.30", "2.31", "2.32", "2.33", "2.34"]}
                    value={versions}
                    onChange={(_event, value) => updateVersions(value)}
                    renderTags={(values: string[]) => values.sort().join(", ")}
                    renderInput={params => (
                        <TextField
                            {...params}
                            variant="standard"
                            label={i18n.t("DHIS2 Version (*)")}
                        />
                    )}
                />

                <TextField
                    className={classes.row}
                    fullWidth={true}
                    multiline={true}
                    rows={4}
                    label={i18n.t("Description")}
                    value={newPackage.description ?? ""}
                    onChange={onChangeField("description")}
                    error={!!errors["description"]}
                    helperText={errors["description"]?.description}
                />

                <MetadataDropZone onChange={onFileChange} />
            </DialogContent>

            <DialogActions>
                <Button key={"cancel"} onClick={onClose} autoFocus>
                    {i18n.t("Cancel")}
                </Button>

                <Button key={"save"} onClick={() => onSave(false)} color="primary">
                    {i18n.t("Save")}
                </Button>

                <Button key={"saveAndImport"} onClick={() => onSave(true)} color="primary">
                    {i18n.t("Save & import")}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const useStyles = makeStyles({
    row: {
        marginBottom: 25,
    },
    versionRow: {
        width: "100%",
        display: "flex",
        flex: "1 1 auto",
        marginBottom: 25,
    },
    marginRight: {
        marginRight: 10,
    },
});