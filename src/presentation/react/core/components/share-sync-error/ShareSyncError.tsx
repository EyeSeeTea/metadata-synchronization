import { ConfirmationDialog, useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";
import { Checkbox, DialogContent, FormControlLabel, Link, TextField } from "@material-ui/core";
import { SynchronizationResult } from "../../../../../domain/reports/entities/SynchronizationResult";
import i18n from "../../../../../locales";
import React, { useEffect } from "react";
import styled from "styled-components";
import { ShareSyncType, useShareSyncError } from "./useShareSyncError";
import { EmailInput } from "../email-input/EmailInput";
import RadioButtonGroup from "../radio-button-group/RadioButtonGroup";
import { MessageRecipients } from "../message-recipients/MessageRecipients";

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
            loading.show(true, i18n.t("Sending"));
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

    const handleSubjectChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;

        state.changeSubject(value);
    };

    const handleMessageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;

        state.changeText(value);
    };

    const handleChangeType = (type: string) => {
        state.changeType(type as ShareSyncType);
    };

    const handleAgreementChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        state.onAggreementChange(event.target.checked);
    };

    return (
        <ConfirmationDialog
            isOpen={true}
            title={i18n.t("Share error information")}
            onCancel={onClose}
            onSave={state.send}
            cancelText={i18n.t("Discard")}
            saveText={i18n.t("Send")}
            maxWidth={"lg"}
            fullWidth={true}
            disableSave={!state.agreementAccepted}
        >
            <DialogContent>
                <RadioButtonGroup value={state.type} items={state.typeOptions} onValueChange={handleChangeType} />
                <StyledForm>
                    {state.type === "Email" ? (
                        <EmailInput
                            label={i18n.t("To")}
                            name="to"
                            emails={state.toEmail}
                            onEmailsChange={state.changeToEmail}
                            variant="outlined"
                        />
                    ) : (
                        <MessageRecipients
                            label={i18n.t("To")}
                            name="to"
                            recipients={state.toMessageRecipients}
                            onRecipientsChange={state.changeToMessageRecipients}
                            variant="outlined"
                        />
                    )}

                    <StyledTextField
                        label={i18n.t("Subject")}
                        name="subject"
                        placeholder="."
                        value={state.subject}
                        onChange={handleSubjectChange}
                        variant="outlined"
                    />
                    <StyledTextField
                        label={i18n.t("Message")}
                        name="message"
                        placeholder="."
                        value={state.text}
                        onChange={handleMessageChange}
                        variant="outlined"
                        multiline
                        rows={12}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                color="primary"
                                checked={state.agreementAccepted}
                                onChange={handleAgreementChange}
                                required
                            />
                        }
                        label={
                            <>
                                {i18n.t("I have read and accept the ")}
                                <Link href={"https://eyeseetea.com/privacy-policy/"} target="_blank">
                                    {i18n.t("EyeSeeTea S.L. Privacy Policy")}
                                </Link>
                                {i18n.t(" paying special attention to the section about ")}
                                <Link href={"https://eyeseetea.com/privacy-policy/#Feedback"} target="_blank">
                                    {i18n.t("share sesitive data")}
                                </Link>
                            </>
                        }
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
    margin-top: 20px;
`;

const StyledTextField = styled(TextField)`
    width: 100%;
`;
