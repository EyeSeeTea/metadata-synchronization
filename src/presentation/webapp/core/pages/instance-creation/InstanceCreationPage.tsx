import { ConfirmationDialog, useSnackbar } from "@eyeseetea/d2-ui-components";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useHistory, useLocation, useParams } from "react-router-dom";
import { Instance } from "../../../../../domain/instance/entities/Instance";
import i18n from "../../../../../utils/i18n";
import { useAppContext } from "../../../../react/core/contexts/AppContext";
import PageHeader from "../../../../react/core/components/page-header/PageHeader";
import { TestWrapper } from "../../../../react/core/components/test-wrapper/TestWrapper";
import GeneralInfoForm from "./GeneralInfoForm";
import { Button, Card, CardContent, makeStyles } from "@material-ui/core";
import _ from "lodash";
import SaveButton from "./SaveButton";
import { ValidationError } from "../../../../../domain/common/entities/Validations";

const InstanceCreationPage = () => {
    const { compositionRoot } = useAppContext();
    const classes = useStyles();
    const history = useHistory();
    const { id, action } = useParams<{ id: string; action: "new" | "edit" }>();
    const location = useLocation<{ instance?: Instance }>();
    const isEdit = useMemo(() => action === "edit" && id !== undefined, [action, id]);

    const [error, setError] = useState<boolean>(false);
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const [instance, setInstance] = useState<Instance>(Instance.build({ name: "", description: "", url: "" }));
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const snackbar = useSnackbar();
    const [errors, setErrors] = useState<ValidationError[]>([]);

    useEffect(() => {
        if (location.state?.instance) {
            setInstance(location.state?.instance);
        } else if (isEdit) {
            compositionRoot.instances.getById(id).then(result =>
                result.match({
                    success: setInstance,
                    error: () => {
                        setError(true);
                    },
                })
            );
        }
    }, [compositionRoot, id, isEdit, location]);

    const cancelSave = useCallback(() => {
        setDialogOpen(true);
    }, []);

    const handleConfirm = useCallback(() => {
        setDialogOpen(true);
        history.push("/instances");
    }, [history]);

    const handleDialogCancel = useCallback(() => {
        setDialogOpen(false);
    }, []);

    const onChange = useCallback((instance: Instance) => {
        const errors = instance.validate();
        setErrors(errors);
        setInstance(instance);
    }, []);

    const title = !isEdit ? i18n.t("New Instance") : i18n.t("Edit Instance");

    const cancel = !isEdit ? i18n.t("Cancel Instance Creation") : i18n.t("Cancel Instance Editing");

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

    if (error) return null;

    return (
        <TestWrapper>
            <ConfirmationDialog
                isOpen={dialogOpen}
                onSave={handleConfirm}
                onCancel={handleDialogCancel}
                title={cancel}
                description={i18n.t("All your changes will be lost. Are you sure?")}
                saveText={i18n.t("Ok")}
            />

            <PageHeader title={title} onBackClick={cancelSave} />

            {instance.type === "dhis" && (
                <Card>
                    <CardContent className={classes.formContainer}>
                        <GeneralInfoForm
                            instance={instance}
                            onChange={onChange}
                            testConnectionVisible={isEdit}
                            mode={"normal"}
                        />
                        <div className={classes.buttonContainer}>
                            <div>
                                <SaveButton onClick={saveAction} isSaving={isSaving} data-test={"save-button"} />
                                <Button variant="contained" onClick={cancelSave} data-test={"cancel-button"}>
                                    {i18n.t("Cancel")}
                                </Button>
                            </div>
                            <div className={classes.actionButtonsContainer}>
                                {instance.id && (
                                    <Button
                                        variant="contained"
                                        onClick={goToMetadataMapping}
                                        data-test={"metadata-mapping-button"}
                                        className={classes.metadataMappingButton}
                                    >
                                        {i18n.t("Metadata mapping")}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </TestWrapper>
    );
};

export default InstanceCreationPage;

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
}));
