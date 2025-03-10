import { useState, useCallback, useEffect } from "react";
import { EmailAddress } from "../../../../../domain/comunications/entities/EmailAddress";

export function useEmailInput(
    emails?: string[],
    text?: string,
    onEmailsChange?: (emails: string[]) => void,
    onTextChange?: (text: string) => void
) {
    const [internalText, setInternalText] = useState(text || "");
    const [internalEmails, setInternalEmails] = useState<string[]>(emails || []);

    useEffect(() => {
        setInternalEmails(emails || []);
    }, [emails]);

    useEffect(() => {
        setInternalText(text || "");
    }, [text]);

    const tryAddEmail = useCallback(
        (email: string) => {
            const emailAddress = EmailAddress.create(email);

            if (emailAddress.isSuccess()) {
                const emails = [...internalEmails, email.trim()];
                setInternalEmails(emails);
                setInternalText("");

                if (onEmailsChange) {
                    onEmailsChange(emails);
                }

                if (onTextChange) {
                    onTextChange(internalText);
                }
            }
        },
        [internalEmails, internalText, onEmailsChange, onTextChange]
    );

    const handleDelete = useCallback(
        (emailToDelete: string) => {
            const emails = internalEmails.filter(email => email !== emailToDelete);
            setInternalEmails(emails);

            if (onEmailsChange) {
                onEmailsChange(emails);
            }
        },
        [internalEmails, onEmailsChange]
    );

    const handleInternalEmailInputChange = useCallback(
        (text: string) => {
            setInternalText(text);

            if (onTextChange) {
                onTextChange(internalText);
            }
        },
        [internalText, onTextChange]
    );

    return {
        internalText,
        internalEmails,
        tryAddEmail,
        handleDelete,
        handleInternalEmailInputChange,
    };
}
