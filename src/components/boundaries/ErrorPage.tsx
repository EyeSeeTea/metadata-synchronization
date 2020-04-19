import { Typography } from "@material-ui/core";
import axios from "axios";
import { useD2Api } from "d2-api";
import { ConfirmationDialog } from "d2-ui-components";
import React, { ErrorInfo, useEffect, useState } from "react";
import i18n from "../../locales";

export interface ErrorPageProps {
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export interface ErrorPayload {
    error: Error | null;
    errorInfo: ErrorInfo | null;
    username?: string;
    url: string;
    browser: string;
}

const buildErrorMessage = ({ error, username, url, browser }: ErrorPayload) => {
    return (
        <React.Fragment>
            <Typography>{`${error?.name}: ${error?.message}`}</Typography>
            <Typography>{`${i18n.t("Username")}: ${username}`}</Typography>
            <Typography>{`${i18n.t("Browser")}: ${browser}`}</Typography>
            <Typography>{`${i18n.t("URL")}: ${url}`}</Typography>
        </React.Fragment>
    );
};

const buildErrorMarkDown = ({ error, errorInfo, username, url, browser }: ErrorPayload) => {
    return [
        "## Fatal crash",
        `- Browser: ${browser}`,
        `- Username: ${username}`,
        `- URL: ${url}`,
        "",
        "## Debug info",
        `- Error: ${error?.name}`,
        `- Message: ${error?.message}`,
        "",
        "```",
        error?.stack,
        "```",
        "",
        "```",
        errorInfo?.componentStack,
        "```",
    ].join("\n");
};

const ErrorPage: React.FC<ErrorPageProps> = ({ error, errorInfo }) => {
    const api = useD2Api();
    const [username, setUsername] = useState<string>();
    const [githubToken, setGithubToken] = useState<string>();
    const [githubRepo, setGihubRepo] = useState<string>();

    useEffect(() => {
        api.currentUser
            .get({ fields: { userCredentials: { username: true } } })
            .getData()
            .then(({ userCredentials }) => {
                setUsername(userCredentials.username);
            });
    }, [api]);

    useEffect(() => {
        axios.get("app-config.json").then(({ data }) => {
            setGithubToken(data?.feedback?.token?.join(""));
            setGihubRepo(data?.feedback?.issues?.repository);
        });
    }, []);

    const buildErrorPayload = (): ErrorPayload => ({
        error,
        errorInfo,
        username,
        url: window.location.href,
        browser: window.navigator.appVersion,
    });

    const reload = () => {
        window.location.reload();
    };

    const sendFeedback = () => {
        axios
            .post(
                `https://api.github.com/repos/${githubRepo}/issues`,
                {
                    title: `[Fatal Error] App crash at ${new Date().toUTCString()}`,
                    body: buildErrorMarkDown(buildErrorPayload()),
                },
                {
                    headers: {
                        Authorization: `token ${githubToken}`,
                    },
                }
            )
            .then(reload);
    };

    return (
        <ConfirmationDialog
            isOpen={true}
            title={i18n.t("An unexpected error happened in the application")}
            description={buildErrorMessage(buildErrorPayload())}
            onSave={reload}
            saveText={i18n.t("Reload")}
            onCancel={sendFeedback}
            cancelText={i18n.t("Send feedback")}
        ></ConfirmationDialog>
    );
};

export default ErrorPage;
