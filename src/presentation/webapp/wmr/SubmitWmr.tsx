import React from "react";
import { useLoading } from "@eyeseetea/d2-ui-components";
import { Button, Typography, Box } from "@material-ui/core";
import { CloudUpload as SyncIcon } from "@material-ui/icons";
import i18n from "../../../utils/i18n";
import { InstanceSelectionDropdown } from "../../react/core/components/instance-selection-dropdown/InstanceSelectionDropdown";
import { Instance } from "../../../domain/instance/entities/Instance";
import GeneralInfoForm from "../core/pages/instance-creation/GeneralInfoForm";
import { Maybe } from "../../../types/utils";
import { Id } from "../../../domain/common/entities/Schemas";
import { OrgUnitInput } from "./components/OrgUnitInput";
import { NoticeBox } from "./components/NoticeBox";

type SubmitWmrProps = {};

export function SubmitWmr(_props: SubmitWmrProps) {
    const loading = useLoading();
    const [selectedTargetInstance, setSelectedTargetInstance] = React.useState<Instance | null>(null);
    const [newInstance, setNewInstance] = React.useState<Instance | null>(null);
    const [targetOrgUnitId, setTargetOrgUnitId] = React.useState<Maybe<Id>>();
    const onSubmit = async () => {
        loading.show(true, i18n.t("Sending data to target instance..."));
    };
    const onClickAddNewInstance = () => {
        const newInstance = Instance.build({ name: "", description: "", url: "" });
        setNewInstance(newInstance);
        setSelectedTargetInstance(newInstance);
    };
    const onCancelAddNewInstance = () => {
        setNewInstance(null);
    };
    const onChangeNewInstance = (instance: Instance) => {
        setNewInstance(instance);
        setTargetOrgUnitId(null);
    };
    const onNewInstanceSaved = (instance: Instance) => {
        setNewInstance(null);
        setSelectedTargetInstance(instance);
    };

    const sendIsDisabled = !selectedTargetInstance?.url || !targetOrgUnitId || loading.isLoading;

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                {i18n.t("Submit WMR Data")}
            </Typography>
            <Box>
                <Typography variant="body1" gutterBottom>
                    {i18n.t(
                        "Your data is ready for submission. Please select a target DHIS2 Instance and Organisation Unit:"
                    )}
                </Typography>
            </Box>
            <Box p={2}>
                {newInstance ? (
                    <GeneralInfoForm
                        instance={newInstance}
                        onChange={onChangeNewInstance}
                        cancelAction={onCancelAddNewInstance}
                        onSaved={onNewInstanceSaved}
                    />
                ) : (
                    <>
                        <InstanceSelectionDropdown
                            showInstances={{ remote: true }}
                            onChangeSelected={(instanceType, instance) => {
                                if (instanceType === "remote" && instance instanceof Instance) {
                                    setSelectedTargetInstance(instance);
                                    setNewInstance(null);
                                }
                            }}
                            selectedInstance={selectedTargetInstance?.id}
                        />
                        {selectedTargetInstance?.url && (
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={() => setNewInstance(selectedTargetInstance)}
                                style={{ marginTop: "10px", marginLeft: "10px" }}
                            >
                                {i18n.t("Edit")}
                            </Button>
                        )}

                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={onClickAddNewInstance}
                            style={{ marginTop: "10px", marginLeft: "10px" }}
                        >
                            {i18n.t("Create New Target Instance")}
                        </Button>
                    </>
                )}
            </Box>
            {selectedTargetInstance?.url && !newInstance && (
                <Box p={2}>
                    <OrgUnitInput instance={selectedTargetInstance} onChange={setTargetOrgUnitId} />
                </Box>
            )}
            <Box p={2}>
                <NoticeBox
                    type={selectedTargetInstance?.url ? "success" : "error"}
                    message={
                        selectedTargetInstance?.url
                            ? `${i18n.t("Target Instance ")}: ${selectedTargetInstance.url}`
                            : i18n.t("Please select a target instance to submit the data")
                    }
                />
                <NoticeBox
                    type={targetOrgUnitId ? "success" : "error"}
                    message={
                        targetOrgUnitId
                            ? `${i18n.t("Target Organisation Unit Id")}: ${targetOrgUnitId}`
                            : i18n.t("Please provide a target organisation unit ID and Validate it")
                    }
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={onSubmit}
                    endIcon={<SyncIcon />}
                    disabled={sendIsDisabled}
                    style={{ margin: "1em 0" }}
                >
                    {i18n.t("Send DataValues to target instance")}
                </Button>
            </Box>
        </Box>
    );
}
