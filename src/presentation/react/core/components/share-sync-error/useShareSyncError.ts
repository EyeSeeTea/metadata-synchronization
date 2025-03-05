import i18n from "@eyeseetea/feedback-component/locales";
import { useCallback, useState } from "react";
import { Email } from "../../../../../domain/email/Email";
import { useAppContext } from "../../contexts/AppContext";

type ShareSyncState = {
    to: string;
    subject: string;
    text: string;
    messageToUser: MessageToUser | undefined;
    sending: boolean;
    onToChange: (to: string) => void;
    onSubjectChange: (subject: string) => void;
    onTextChange: (message: string) => void;
    onSendEmail: () => void;
};

type MessageToUser = {
    message: string;
    type: "error" | "success";
};

export function useShareSyncError(): ShareSyncState {
    const [to, setTo] = useState<string>("");
    const [subject, setSubject] = useState<string>("");
    const [text, setText] = useState<string>("");
    const [messageToUser, setMessageToUser] = useState<MessageToUser>();
    const [sending, setSending] = useState(false);

    const { compositionRoot } = useAppContext();

    const onToChange = useCallback((to: string) => {
        setTo(to);
    }, []);

    const onSubjectChange = useCallback((subject: string) => {
        setSubject(subject);
    }, []);

    const onTextChange = useCallback((message: string) => {
        setText(message);
    }, []);

    const onSendEmail = useCallback(async () => {
        const email = Email.create({
            recipients: to.split(","),
            subject,
            text,
        });

        setSending(true);

        const response = await compositionRoot.email.send(email);

        response.match({
            error: error => {
                setSending(false);
                setMessageToUser({ message: error.message, type: "error" });
            },
            success: () => {
                setSending(false);
                setMessageToUser({ message: i18n.t("Email sending successfully"), type: "success" });
            },
        });
    }, [compositionRoot.email, text, subject, to]);

    return {
        to,
        subject,
        text,
        messageToUser,
        sending,
        onToChange,
        onSubjectChange,
        onTextChange,
        onSendEmail,
    };
}
