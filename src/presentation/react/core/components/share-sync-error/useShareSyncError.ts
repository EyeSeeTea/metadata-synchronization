import { useCallback, useState } from "react";

type ShareSyncState = {
    to: string;
    subject: string;
    message: string;
    onToChange: (to: string) => void;
    onSubjectChange: (subject: string) => void;
    onMessageChange: (message: string) => void;
};

export function useShareSyncError(): ShareSyncState {
    const [to, setTo] = useState<string>("");
    const [subject, setSubject] = useState<string>("");
    const [message, setMessage] = useState<string>("");

    const onToChange = useCallback((to: string) => {
        setTo(to);
    }, []);

    const onSubjectChange = useCallback((subject: string) => {
        setSubject(subject);
    }, []);

    const onMessageChange = useCallback((message: string) => {
        setMessage(message);
    }, []);

    return {
        to,
        subject,
        message,
        onToChange,
        onSubjectChange,
        onMessageChange,
    };
}
