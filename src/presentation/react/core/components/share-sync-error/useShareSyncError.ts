import i18n from "@eyeseetea/feedback-component/locales";
import { useCallback, useEffect, useState } from "react";
import { Future } from "../../../../../domain/common/entities/Future";
import { AttachedFile } from "../../../../../domain/comunications/entities/AttachedFile";
import { Email } from "../../../../../domain/comunications/entities/Email";
import { Message } from "../../../../../domain/comunications/entities/Message";
import { MessageRecipientProps } from "../../../../../domain/comunications/entities/MessageRecipient";
import { ResultInstance, SynchronizationResult } from "../../../../../domain/reports/entities/SynchronizationResult";
import { Store } from "../../../../../domain/stores/entities/Store";
import { useAppContext } from "../../contexts/AppContext";

type ShareSyncState = {
    type: ShareSyncType;
    toEmail: string[];
    toMessageRecipients: MessageRecipientProps[];
    subject: string;
    text: string;
    messageToUser: MessageToUser | undefined;
    sending: boolean;
    attachingFiles: boolean;
    changeType: (type: ShareSyncType) => void;
    changeToEmail: (to: string[]) => void;
    changeToMessageRecipients: (to: MessageRecipientProps[]) => void;
    changeSubject: (subject: string) => void;
    changeText: (message: string) => void;
    send: () => void;
    typeOptions: TypeOption[];
    agreementAccepted: boolean;
    onAggreementChange: (accepted: boolean) => void;
};

const typeOptions: TypeOption[] = [
    { id: "Email", name: i18n.t("Email") },
    { id: "Message", name: i18n.t("Message") },
];

type TypeOption = { id: string; name: string };

export type ShareSyncType = "Email" | "Message";

type MessageToUser = {
    message: string;
    type: "error" | "success";
};

export function useShareSyncError(errorResults: SynchronizationResult[]): ShareSyncState {
    const [type, setType] = useState<ShareSyncType>("Email");
    const [toEmail, setToEmail] = useState<string[]>([]);
    const [toMessageRecipients, setToMessageRecipients] = useState<MessageRecipientProps[]>([]);
    const [subject, setSubject] = useState<string>("Error encountered when trying a migration in MetaData Sync");
    const [text, setText] = useState<string>("");
    const [messageToUser, setMessageToUser] = useState<MessageToUser>();
    const [sending, setSending] = useState(false);
    const [attachingFiles, setAttachingFiles] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const [agreementAccepted, setAgreementAccepted] = useState(false);

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
                    compositionRoot.comunications.attachFile({
                        name: `${result.type}-payload.json`,
                        data: createJsonBobByObject(result.payload),
                    }),
                    compositionRoot.comunications.attachFile({
                        name: `${result.type}-summary.json`,
                        data: createJsonBobByObject(result.response),
                    }),
                ];
            })
            .flat();

        Future.parallel(futures, { concurrency: 5 }).run(
            files => {
                setAttachingFiles(false);
                setAttachedFiles(files);
            },
            error => {
                setAttachingFiles(false);
                setMessageToUser({ message: error.message, type: "error" });
            }
        );
    }, [compositionRoot.comunications, errorResults]);

    const changeType = useCallback((type: ShareSyncType) => {
        setType(type);
        setToEmail([]);
    }, []);

    const changeToEmail = useCallback((to: string[]) => {
        setToEmail(to);
    }, []);

    const changeToMessageRecipients = useCallback((recipients: MessageRecipientProps[]) => {
        setToMessageRecipients(recipients);
    }, []);

    const onSubjectChange = useCallback((subject: string) => {
        setSubject(subject);
    }, []);

    const changeText = useCallback((message: string) => {
        setText(message);
    }, []);

    const sendEmail = useCallback(async () => {
        const emailValidation = Email.create({
            recipients: toEmail,
            subject,
            text,
        });

        emailValidation.match({
            success: email => {
                setSending(true);

                compositionRoot.comunications.sendEmail(email).run(
                    () => {
                        setSending(false);
                        setMessageToUser({ message: i18n.t("Email sent successfully"), type: "success" });
                    },
                    error => {
                        setSending(false);
                        setMessageToUser({ message: error.message, type: "error" });
                    }
                );
            },
            error: errors => {
                setMessageToUser({ message: errors.map(error => error.description).join("\n"), type: "error" });
            },
        });
    }, [toEmail, subject, text, compositionRoot.comunications]);

    const sendMessage = useCallback(async () => {
        const messageValidation = Message.create({
            recipients: toMessageRecipients,
            subject,
            text,
        });

        messageValidation.match({
            success: message => {
                setSending(true);

                compositionRoot.comunications.sendMessage(message).run(
                    () => {
                        setSending(false);
                        setMessageToUser({ message: i18n.t("Message sent successfully"), type: "success" });
                    },
                    error => {
                        setSending(false);
                        setMessageToUser({ message: error.message, type: "error" });
                    }
                );
            },
            error: errors => {
                setMessageToUser({ message: errors.join("\n"), type: "error" });
            },
        });
    }, [toMessageRecipients, subject, text, compositionRoot.comunications]);

    const send = useCallback(async () => {
        if (type === "Email") {
            sendEmail();
        } else {
            sendMessage();
        }
    }, [type, sendEmail, sendMessage]);

    const onAggreementChange = useCallback((accepted: boolean) => {
        setAgreementAccepted(accepted);
    }, []);

    return {
        type,
        toEmail,
        toMessageRecipients,
        subject,
        text,
        messageToUser,
        sending,
        attachingFiles,
        changeType,
        changeToEmail,
        changeToMessageRecipients,
        changeSubject: onSubjectChange,
        changeText,
        send,
        typeOptions,
        agreementAccepted,
        onAggreementChange,
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
