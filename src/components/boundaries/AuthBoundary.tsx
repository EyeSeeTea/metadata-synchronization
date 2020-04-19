import { init } from "d2";
import { ApiContext, D2Api, D2ApiDefault } from "d2-api";
import React, { useState, useEffect } from "react";
import LoginPage, { LoginConfig } from "./LoginPage";

const initApi = async ({ server, username = "", password = "" }: LoginConfig) => {
    const login = !!username && !!password;
    const loginProps = login ? { auth: { username, password } } : {};

    const api = new D2ApiDefault({ baseUrl: server, ...loginProps });
    const { id } = await api.currentUser.get({ fields: { id: true } }).getData();
    window.localStorage.DHIS2_BASE_URL = server;
    window.localStorage.DHIS2_USER = { id, username };

    return api;
};

const initD2 = async ({ server, username, password }: LoginConfig) => {
    const login = !!username && !!password;
    const loginProps = login
        ? { headers: { Authorization: `Basic ${btoa(`${username}:${password}`)}` } }
        : {};

    return init({
        baseUrl: server + "/api",
        ...loginProps,
    });
};

export interface AuthConfig {
    baseUrl: string;
    apiVersion: string;
    production: boolean;
}

export interface AuthBoundaryProps {
    config: AuthConfig;
    appName?: string;
}

export const AuthBoundary: React.FC<AuthBoundaryProps> = ({ children, config, appName }) => {
    const { baseUrl, production } = config;
    const [api, setApi] = useState<D2Api>();
    const [d2, setD2] = useState<any>();

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<boolean>(false);
    const ready = !!api && !!d2;

    useEffect(() => {
        if (production) {
            initApi({ server: baseUrl }).then(setApi);
            initD2({ server: baseUrl }).then(setD2);
        }
    }, [production, baseUrl]);

    const loginAction = async (config: LoginConfig) => {
        setLoading(true);
        try {
            setApi(await initApi(config));
            setD2(await initD2(config));
            setLoading(false);
        } catch (error) {
            setError(true);
        }
        setLoading(false);
    };

    if (ready) {
        return <ApiContext.Provider value={{ d2, api }}>{children}</ApiContext.Provider>;
    } else if (!production) {
        return (
            <LoginPage
                title={appName}
                loginAction={loginAction}
                loading={loading}
                error={error}
                server={baseUrl}
            />
        );
    } else {
        return null;
    }
};
