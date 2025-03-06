import React, { KeyboardEvent, ChangeEvent, useCallback } from "react";
import styled from "styled-components";
import { TextField, Chip, TextFieldProps } from "@material-ui/core";
import { useEmailInput } from "./useEmailInput";

interface EmailInputProps extends Omit<TextFieldProps, "onChange" | "value"> {
    emails?: string[];
    text?: string;
    onEmailsChange?: (emails: string[]) => void;
    onTextChange?: (text: string) => void;
}

export const EmailInput: React.FC<EmailInputProps> = ({
    emails: propEmails,
    text: propText,
    onEmailsChange,
    onTextChange,
    ...textFieldProps
}) => {
    // Estados internos del custom hook
    const { internalText, internalEmails, handleInternalEmailInputChange, tryAddEmail, handleDelete } = useEmailInput(
        propEmails,
        propText,
        onEmailsChange,
        onTextChange
    );

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if ((event.key === "Enter" || event.key === "Tab") && internalText.trim()) {
            tryAddEmail(internalText);
            event.preventDefault();
        }
    };

    const handleInputChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            handleInternalEmailInputChange(e.target.value);
        },
        [handleInternalEmailInputChange]
    );

    return (
        <TextField
            value={internalText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            {...textFieldProps}
            InputProps={{
                startAdornment: (
                    <ChipContainer>
                        {internalEmails.map((email, index) => {
                            return (
                                <SelectedChip
                                    key={`${email}-${index}`}
                                    label={email}
                                    onDelete={() => handleDelete(email)}
                                />
                            );
                        })}
                    </ChipContainer>
                ),
            }}
        />
    );
};

const ChipContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    margin: 8px;
`;

export const SelectedChip = styled(Chip)`
    border-radius: 20px;
    border: none;
    margin: 1px;
`;
