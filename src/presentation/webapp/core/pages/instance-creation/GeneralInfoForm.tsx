import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { Button, Card, CardContent, TextField } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import _, { Dictionary } from "lodash";
import React, { useCallback, useState } from "react";
import { ValidationError } from "../../../../../domain/common/entities/Validations";
import { Instance } from "../../../../../domain/instance/entities/Instance";
import i18n from "../../../../../utils/i18n";
import { Dropdown } from "../../../../react/core/components/dropdown/Dropdown";
import { useAppContext } from "../../../../react/core/contexts/AppContext";

export interface GeneralInfoFormProps {
    instance: Instance;
    onChange: (instance: Instance) => void;
    testConnectionVisible: boolean;
    mode: "basic" | "normal";
}

const authTypeItems = [
    { id: "http-basic", name: i18n.t("Basic") },
    { id: "api-token", name: i18n.t("API Token") },
];

const GeneralInfoForm = ({ instance, onChange, testConnectionVisible, mode }: GeneralInfoFormProps) => {
    const classes = useStyles();
    const [errors, setErrors] = useState<Dictionary<ValidationError>>({});
    const snackbar = useSnackbar();
    const { compositionRoot } = useAppContext();

    const [didPasswordChange, setPasswordChange] = useState<boolean>(false);

    const updateModel = useCallback(
        (field: keyof Instance, value: string) => {
            const newInstance = instance.update({ [field]: value });
            const errors = _.keyBy(newInstance.validate([field], mode === "basic"), "property");

            setErrors(errors);
            onChange(newInstance);
        },
        [instance, mode, onChange]
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

    return (
        <Card>
            <CardContent className={classes.formContainer}>
                {mode === "normal" && (
                    <TextField
                        className={classes.row}
                        fullWidth={true}
                        label={i18n.t("Server name (*)")}
                        value={instance.name ?? ""}
                        onChange={onChangeField("name")}
                        error={!!errors["name"]}
                        helperText={errors["name"]?.description}
                    />
                )}
                {mode === "normal" && (
                    <TextField
                        className={classes.row}
                        fullWidth={true}
                        label={i18n.t("Description")}
                        value={instance.description ?? ""}
                        onChange={onChangeField("description")}
                        error={!!errors["description"]}
                        helperText={errors["description"]?.description}
                    />
                )}
                <TextField
                    className={classes.row}
                    fullWidth={true}
                    label={i18n.t("URL endpoint (*)")}
                    value={instance.url ?? ""}
                    onChange={onChangeField("url")}
                    error={!!errors["url"]}
                    helperText={errors["url"]?.description}
                />

                <div className={classes.dropdown}>
                    <Dropdown
                        items={authTypeItems}
                        label={i18n.t("Authentication Scheme (*)")}
                        value={instance.authType ?? "http-basic"}
                        onValueChange={(value: string) => updateModel("authType", value)}
                        hideEmpty={true}
                    />
                </div>

                {instance.authType === "api-token" && (
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

                {instance.authType === "http-basic" && (
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
                <div className={classes.actionButtonsContainer}>
                    {testConnectionVisible && (
                        <Button variant="contained" onClick={testConnection} data-test={"test-connection-button"}>
                            {i18n.t("Test Connection")}
                        </Button>
                    )}
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
    row: {
        marginBottom: 25,
    },
    dropdown: {
        marginTop: 15,
        marginLeft: 0,
        marginBottom: 20,
    },
    actionButtonsContainer: {
        marginTop: 10,
    },
}));

export default GeneralInfoForm;
