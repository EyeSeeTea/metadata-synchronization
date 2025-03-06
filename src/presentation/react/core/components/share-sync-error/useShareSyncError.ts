import i18n from "@eyeseetea/feedback-component/locales";
import { useCallback, useEffect, useState } from "react";
import { Future } from "../../../../../domain/common/entities/Future";
import { AttachedFile } from "../../../../../domain/email/entities/AttachedFile";
import { Email } from "../../../../../domain/email/entities/Email";
import { ResultInstance, SynchronizationResult } from "../../../../../domain/reports/entities/SynchronizationResult";
import { Store } from "../../../../../domain/stores/entities/Store";
import { useAppContext } from "../../contexts/AppContext";

type ShareSyncState = {
    to: string[];
    subject: string;
    text: string;
    messageToUser: MessageToUser | undefined;
    sending: boolean;
    attachingFiles: boolean;
    onToChange: (to: string[]) => void;
    onSubjectChange: (subject: string) => void;
    onTextChange: (message: string) => void;
    onSendEmail: () => void;
};

type MessageToUser = {
    message: string;
    type: "error" | "success";
};

export function useShareSyncError(errorResults: SynchronizationResult[]): ShareSyncState {
    const [to, setTo] = useState<string[]>([]);
    const [subject, setSubject] = useState<string>("Error encountered when trying a migration in MetaData Sync");
    const [text, setText] = useState<string>("");
    const [messageToUser, setMessageToUser] = useState<MessageToUser>();
    const [sending, setSending] = useState(false);
    const [attachingFiles, setAttachingFiles] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

    const { compositionRoot } = useAppContext();

    useEffect(() => {
        const initialText = errorResults
            .map(result => {
                return `Error encountered when trying a ${
                    result.type
                } migration in MetaData Sync between servers origin: ${getServerInfo(
                    result.origin
                )} and destination: ${getServerInfo(result.instance)}. See the payload and summary below.\n`;
            })
            .join("\n");

        const attachesFileTexts = attachedFiles.map(file => {
            return `- ${file.name}: ${file.url}`;
        });

        setText(`${initialText}\n${attachesFileTexts.join("\n")}`);
    }, [attachedFiles, errorResults]);

    useEffect(() => {
        setAttachingFiles(true);

        const futures = errorResults
            .map(result => {
                return [
                    compositionRoot.email.attachFile({
                        name: `${result.type}-payload.json`,
                        data: createJsonBobByObject(result.payload),
                    }),
                    compositionRoot.email.attachFile({
                        name: `${result.type}-summary.json`,
                        data: createJsonBobByObject(result.response),
                    }),
                ];
            })
            .flat();

        Future.parallel(futures).run(
            files => {
                setAttachingFiles(false);
                setAttachedFiles(files);
            },
            error => {
                setAttachingFiles(false);
                setMessageToUser({ message: error, type: "error" });
            }
        );
    }, [compositionRoot.email, errorResults]);

    const onToChange = useCallback((to: string[]) => {
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
            recipients: to,
            subject,
            text,
        });

        setSending(true);

        compositionRoot.email.send(email).run(
            () => {
                setSending(false);
                setMessageToUser({ message: i18n.t("Email sending successfully"), type: "success" });
            },
            error => {
                setSending(false);
                setMessageToUser({ message: error, type: "error" });
            }
        );
    }, [compositionRoot.email, text, subject, to]);

    return {
        to,
        subject,
        text,
        messageToUser,
        sending,
        attachingFiles,
        onToChange,
        onSubjectChange,
        onTextChange,
        onSendEmail,
    };
}

function createJsonBobByObject(object: unknown): Blob {
    const json = JSON.stringify(object);
    return new Blob([json], { type: "application/json" });
}
function getServerInfo(origin: ResultInstance | Store | undefined): string {
    if (!origin) return "Unknown server";

    if ("version" in origin && "url" in origin) {
        return `${origin.url} (v${origin.version})`;
    }

    if ("repository" in origin) {
        return origin.repository;
    }

    return "Unknown server";
}
