import { ConfirmationDialog, useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";
import { DialogContent, TextField } from "@material-ui/core";
import { SynchronizationResult } from "../../../../../domain/reports/entities/SynchronizationResult";
import i18n from "../../../../../locales";
import React, { useEffect } from "react";
import styled from "styled-components";
import { useShareSyncError } from "./useShareSyncError";

interface SyncSummaryProps {
    errorResults: SynchronizationResult[];
    onClose: () => void;
}

export const ShareSyncError = ({ errorResults, onClose }: SyncSummaryProps) => {
    const state = useShareSyncError(errorResults);
    const snackbar = useSnackbar();
    const loading = useLoading();

    useEffect(() => {
        if (state.messageToUser?.type === "success") {
            snackbar.success(state.messageToUser.message);
        } else if (state.messageToUser?.type === "error") {
            snackbar.error(state.messageToUser.message);
        }
    }, [state.messageToUser, snackbar]);

    useEffect(() => {
        if (state.sending) {
            loading.show(true, i18n.t("Sending email"));
        } else {
            loading.hide();
        }
    }, [state.sending, loading]);

    useEffect(() => {
        if (state.attachingFiles) {
            loading.show();
        } else {
            loading.hide();
        }
    }, [state.attachingFiles, loading]);

    const handleToChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;

        state.onToChange(value);
    };

    const handleSubjectChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;

        state.onSubjectChange(value);
    };

    const handleMessageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;

        state.onTextChange(value);
    };

    return (
        <ConfirmationDialog
            isOpen={true}
            title={i18n.t("Share error information")}
            onCancel={onClose}
            onSave={state.onSendEmail}
            cancelText={i18n.t("Discard")}
            saveText={i18n.t("Send")}
            maxWidth={"lg"}
            fullWidth={true}
        >
            <DialogContent>
                <StyledForm>
                    <StyledTextField
                        label={i18n.t("To")}
                        name="to"
                        value={state.to}
                        onChange={handleToChange}
                        variant="outlined"
                    />
                    <StyledTextField
                        label={i18n.t("Subject")}
                        name="subject"
                        value={state.subject}
                        onChange={handleSubjectChange}
                        variant="outlined"
                    />
                    <StyledTextField
                        label={i18n.t("Message")}
                        name="message"
                        value={state.text}
                        onChange={handleMessageChange}
                        variant="outlined"
                        multiline
                        rows={12}
                    />
                </StyledForm>
            </DialogContent>
        </ConfirmationDialog>
    );
};

const StyledForm = styled.form`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const StyledTextField = styled(TextField)`
    width: 100%;
`;
