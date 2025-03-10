import { useState, useCallback, useEffect } from "react";
import { MessageRecipientProps } from "../../../../../domain/comunications/entities/MessageRecipient";

import { useAppContext } from "../../contexts/AppContext";

export function useMessageRecipients(
    recipients?: MessageRecipientProps[],
    text?: string,
    onRecipientsChange?: (recipients: MessageRecipientProps[]) => void,
    onTextChange?: (text: string) => void
) {
    const { compositionRoot } = useAppContext();
    const [internalText, setInternalText] = useState(text || "");
    const [internalRecipients, setInternalRecipients] = useState<MessageRecipientProps[]>(recipients || []);
    const [recipientCandidates, setRecipientCandidates] = useState<MessageRecipientProps[]>([]);

    useEffect(() => {
        setInternalRecipients(recipients || []);
    }, [recipients]);

    useEffect(() => {
        setInternalText(text || "");
    }, [text]);

    const handleDelete = useCallback(
        (recipientId: string) => {
            const emails = internalRecipients.filter(recipient => recipient.id !== recipientId);
            setInternalRecipients(emails);

            if (onRecipientsChange) {
                onRecipientsChange(emails);
            }
        },
        [internalRecipients, onRecipientsChange]
    );

    const onSelectCantidate = useCallback(
        (cantidateId: string) => {
            const candidate = recipientCandidates.find(recipient => recipient.id === cantidateId);

            if (candidate) {
                const recipìents = [...internalRecipients, candidate];

                setInternalRecipients(recipìents);
                setRecipientCandidates([]);
                setInternalText("");

                if (onRecipientsChange) {
                    onRecipientsChange(recipìents);
                }
            }
        },
        [internalRecipients, onRecipientsChange, recipientCandidates]
    );

    useEffect(() => {
        if (internalText.length <= 1) return;

        setRecipientCandidates([]);

        const cancel = compositionRoot.comunications.searchMessageRecipients(internalText).run(
            recipients => {
                setRecipientCandidates(recipients);
            },
            error => {
                console.error(error);
            }
        );

        return cancel;
    }, [compositionRoot.comunications, internalText, text]);

    const handleInternalTextChange = useCallback(
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
        internalRecipients,
        recipientCandidates,
        handleDelete,
        handleInternalTextChange,
        onSelectCantidate,
    };
}
