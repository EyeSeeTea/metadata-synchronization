import { Button, Card, CardContent, TextField } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import _, { Dictionary } from "lodash";
import React, { useCallback, useState } from "react";
import { useHistory } from "react-router-dom";
import { ValidationError } from "../../../../../domain/common/entities/Validations";
import { Instance } from "../../../../../domain/instance/entities/Instance";
import i18n from "../../../../../utils/i18n";
import { useAppContext } from "../../../../react/core/contexts/AppContext";
import SaveButton from "./SaveButton";
import { Dropdown } from "../../../../react/core/components/dropdown/Dropdown";

export interface GeneralInfoFormProps {
    instance: Instance;
    onChange: (instance: Instance) => void;
    cancelAction: () => void;
    testConnectionVisible: boolean;
}

export const authTypeItems = [
    { id: "http-basic", name: i18n.t("Basic") },
    { id: "api-token", name: i18n.t("API Token") },
];

const typeItems = [
    { id: "dhis", name: i18n.t("Default") },
    { id: "aggregated-data-exchange", name: i18n.t("Aggregated Data Exchange") },
];

const GeneralInfoForm = ({ instance, onChange, cancelAction, testConnectionVisible }: GeneralInfoFormProps) => {
    const { compositionRoot } = useAppContext();
    const classes = useStyles();
    const history = useHistory();
    const snackbar = useSnackbar();

    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [didPasswordChange, setPasswordChange] = useState<boolean>(false);
    const [errors, setErrors] = useState<Dictionary<ValidationError>>({});

    const updateModel = useCallback(
        (field: keyof Instance, value: string) => {
            const newInstance = instance.update({ [field]: value });
            const errors = _.keyBy(newInstance.validate([field]), "property");

            setErrors(errors);
            onChange(newInstance);
        },
        [instance, onChange]
    );

    const onChangeField = useCallback(
        (field: keyof Instance) => {
            return (event: React.ChangeEvent<{ value: unknown }>) => {
                if (field === "password") setPasswordChange(true);
                updateModel(field, event.target.value as string);
            };
        },
        [updateModel]
    );

    const testConnection = useCallback(async () => {
        if (_.keys(errors).length > 0) {
            snackbar.error(i18n.t("Please fix the issues before testing the connection"));
            return;
        }

        const validation = await compositionRoot.instances.validate(instance);
        validation.match({
            success: () => {
                snackbar.success(i18n.t("Connected successfully to instance"));
            },
            error: error => {
                snackbar.error(error, { autoHideDuration: null });
            },
        });
    }, [compositionRoot, errors, instance, snackbar]);

    const goToMetadataMapping = useCallback(() => {
        history.push(`/instances/mapping/${instance.id}`);
    }, [history, instance]);

    const saveAction = useCallback(async () => {
        if (_.keys(errors).length > 0) {
            snackbar.error(i18n.t("Please fix the issues before testing the connection"));
            return;
        }

        setIsSaving(true);
        const validationErrors = await compositionRoot.instances.save(instance);
        setIsSaving(false);

        if (validationErrors.length === 0) {
            history.push("/instances");
        } else {
            snackbar.error(validationErrors.map(({ description }) => description).join("\n"));
        }
    }, [compositionRoot, errors, history, instance, snackbar]);

    return (
        <Card>
            <CardContent className={classes.formContainer}>
                <TextField
                    className={classes.row}
                    fullWidth={true}
                    label={i18n.t("Server name (*)")}
                    value={instance.name ?? ""}
                    onChange={onChangeField("name")}
                    error={!!errors["name"]}
                    helperText={errors["name"]?.description}
                />
                <TextField
                    className={classes.row}
                    fullWidth={true}
                    label={i18n.t("Description")}
                    value={instance.description ?? ""}
                    onChange={onChangeField("description")}
                    error={!!errors["description"]}
                    helperText={errors["description"]?.description}
                />
                <div className={classes.dropdown}>
                    <Dropdown
                        items={typeItems}
                        label={i18n.t("Type")}
                        value={instance.type}
                        onValueChange={(value: string) => updateModel("type", value)}
                        hideEmpty={true}
                    />
                </div>

                <TextField
                    className={classes.row}
                    fullWidth={true}
                    label={i18n.t("URL endpoint (*)")}
                    value={instance.url ?? ""}
                    onChange={onChangeField("url")}
                    error={!!errors["url"]}
                    helperText={errors["url"]?.description}
                />

                {instance.type === "dhis" && (
                    <div className={classes.dropdown}>
                        <Dropdown
                            items={authTypeItems}
                            label={i18n.t("Authentication Scheme (*)")}
                            value={instance.authType ?? "http-basic"}
                            onValueChange={(value: string) => updateModel("authType", value)}
                            hideEmpty={true}
                        />
                    </div>
                )}

                {instance.type === "dhis" && instance.authType === "api-token" && (
                    <TextField
                        className={classes.row}
                        fullWidth={true}
                        label={i18n.t("Token (*)")}
                        value={instance.token ?? ""}
                        onChange={onChangeField("token")}
                        error={!!errors["token"]}
                        helperText={errors["token"]?.description}
                    />
                )}

                {instance.type === "dhis" && instance.authType === "http-basic" && (
                    <>
                        <TextField
                            className={classes.row}
                            fullWidth={true}
                            label={i18n.t("Username (*)")}
                            value={instance.username ?? ""}
                            onChange={onChangeField("username")}
                            error={!!errors["username"]}
                            helperText={errors["username"]?.description}
                        />
                        <TextField
                            className={classes.row}
                            type="password"
                            fullWidth={true}
                            label={i18n.t("Password (*)")}
                            value={didPasswordChange ? instance.password : ""}
                            onChange={onChangeField("password")}
                            error={!!errors["password"]}
                            helperText={errors["password"]?.description}
                        />
                    </>
                )}

                <div className={classes.buttonContainer}>
                    <div>
                        <SaveButton onClick={saveAction} isSaving={isSaving} data-test={"save-button"} />
                        <Button variant="contained" onClick={cancelAction} data-test={"cancel-button"}>
                            {i18n.t("Cancel")}
                        </Button>
                    </div>
                    <div className={classes.actionButtonsContainer}>
                        {instance.type === "dhis" && instance.id && (
                            <Button
                                variant="contained"
                                onClick={goToMetadataMapping}
                                data-test={"metadata-mapping-button"}
                                className={classes.metadataMappingButton}
                            >
                                {i18n.t("Metadata mapping")}
                            </Button>
                        )}
                        {testConnectionVisible && instance.type === "dhis" && (
                            <Button variant="contained" onClick={testConnection} data-test={"test-connection-button"}>
                                {i18n.t("Test Connection")}
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const useStyles = makeStyles(() => ({
    formContainer: {
        marginTop: 30,
        paddingRight: 70,
        paddingLeft: 70,
        paddingBottom: 30,
    },
    buttonContainer: {
        display: "flex",
        justifyContent: "space-between",
        paddingTop: 30,
    },
    actionButtonsContainer: {
        marginTop: 10,
    },
    metadataMappingButton: {
        margin: 16,
    },
    row: {
        marginBottom: 25,
    },
    dropdown: {
        marginTop: 15,
        marginLeft: -10,
        marginBottom: 20,
    },
}));

export default GeneralInfoForm;
