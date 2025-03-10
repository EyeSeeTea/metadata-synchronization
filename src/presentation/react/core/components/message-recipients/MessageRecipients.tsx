import React, { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { TextField, Chip, TextFieldProps, Menu, MenuItem } from "@material-ui/core";
import { MessageRecipient } from "../../../../../domain/comunications/entities/Message";
import { useMessageRecipients } from "./useMessageRecipients";

interface MessageRecipientsProps extends Omit<TextFieldProps, "onChange" | "value"> {
    recipients?: MessageRecipient[];
    text?: string;
    onRecipientsChange?: (recipients: MessageRecipient[]) => void;
    onTextChange?: (text: string) => void;
}

export const MessageRecipients: React.FC<MessageRecipientsProps> = ({
    recipients: propRecipients,
    text: propText,
    onRecipientsChange,
    onTextChange,
    ...textFieldProps
}) => {
    const {
        internalText,
        internalRecipients,
        recipientCandidates,
        handleInternalTextChange,
        handleDelete,
        onSelectCantidate,
    } = useMessageRecipients(propRecipients, propText, onRecipientsChange, onTextChange);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (recipientCandidates.length > 0) {
            setAnchorEl(ref.current);
        } else {
            setAnchorEl(null);
        }
    }, [internalText, recipientCandidates.length]);

    const handleInputChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            handleInternalTextChange(e.target.value);
        },
        [handleInternalTextChange]
    );

    const handleCloseOptionsMenu = useCallback(() => {
        setAnchorEl(null);
    }, []);

    return (
        <>
            <TextField
                ref={ref}
                value={internalText}
                onChange={handleInputChange}
                {...textFieldProps}
                InputProps={{
                    startAdornment: (
                        <ChipContainer>
                            {internalRecipients.map((recipient, index) => {
                                return (
                                    <SelectedChip
                                        key={`${recipient.id}-${index}`}
                                        label={recipient.name}
                                        onDelete={() => handleDelete(recipient.id)}
                                    />
                                );
                            })}
                        </ChipContainer>
                    ),
                }}
            />
            <Menu
                id="simple-menu"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleCloseOptionsMenu}
            >
                {recipientCandidates.map((candidate, index) => {
                    return (
                        <MenuItem key={`${candidate.id}-${index}`} onClick={() => onSelectCantidate(candidate.id)}>
                            {candidate.name}
                        </MenuItem>
                    );
                })}
            </Menu>
        </>
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
