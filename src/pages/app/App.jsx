import i18n from "@dhis2/d2-i18n";
import { HeaderBar } from "@dhis2/ui-widgets";
import { MuiThemeProvider } from "@material-ui/core/styles";
import { createGenerateClassName, StylesProvider } from "@material-ui/styles";
import axiosRetry from "axios-retry";
import { D2ApiDefault, useD2, useD2Api } from "d2-api";
import { LoadingProvider, SnackbarProvider } from "d2-ui-components";
import _ from "lodash";
import OldMuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import React, { useEffect, useState } from "react";
import Migrations from "../../components/migrations/Migrations";
import Share from "../../components/share/Share";
import { MigrationsRunner } from "../../migrations";
import Instance from "../../models/instance";
import { initializeAppRoles } from "../../utils/permissions";
import "./App.css";
import Root from "./Root";
import muiThemeLegacy from "./themes/dhis2-legacy.theme";
import { muiTheme } from "./themes/dhis2.theme";

const generateClassName = createGenerateClassName({
    productionPrefix: "c",
});

const isLangRTL = code => {
    const langs = ["ar", "fa", "ur"];
    const prefixed = langs.map(c => `${c}-`);
    return _(langs).includes(code) || prefixed.filter(c => code && code.startsWith(c)).length > 0;
};

function initFeedbackTool(d2, appConfig) {
    const appKey = _(appConfig).get("appKey");

    if (appConfig && appConfig.feedback) {
        const feedbackOptions = {
            ...appConfig.feedback,
            i18nPath: "feedback-tool/i18n",
        };
        if (window.$) window.$.feedbackDhis2(d2, appKey, feedbackOptions);
        else console.error("Could not initialize feedback tool");
    }
}

const configI18n = ({ keyUiLocale: uiLocale }) => {
    i18n.changeLanguage(uiLocale);
    document.documentElement.setAttribute("dir", isLangRTL(uiLocale) ? "rtl" : "ltr");
};

const App = () => {
    const d2 = useD2();
    const api = useD2Api();

    const [migrationsState, setMigrationsState] = useState({ type: "checking" });
    const [showShareButton, setShowShareButton] = useState(false);

    useEffect(() => {
        const { cancel, response } = api.get("/userSettings");
        response.then(async ({ data: userSettings }) => {
            const appConfig = await fetch("app-config.json").then(res => res.json());

            configI18n(userSettings);
            setShowShareButton(_(appConfig).get("appearance.showShareButton") || false);
            initFeedbackTool(d2, appConfig);

            if (appConfig && appConfig.encryptionKey) {
                Instance.setEncryptionKey(appConfig.encryptionKey);
            }

            await initializeAppRoles(api.apiPath);
            runMigrations(api.baseUrl).then(setMigrationsState);
        });

        return cancel;
    }, [api, d2]);

    if (migrationsState.type === "pending") {
        return (
            <Migrations
                runner={migrationsState.runner}
                onFinish={() => setMigrationsState({ type: "checked" })}
            />
        );
    } else if (migrationsState.type === "checked") {
        return (
            <StylesProvider generateClassName={generateClassName}>
                <MuiThemeProvider theme={muiTheme}>
                    <OldMuiThemeProvider muiTheme={muiThemeLegacy}>
                        <LoadingProvider>
                            <SnackbarProvider>
                                <HeaderBar appName={i18n.t("MetaData Synchronization")} />
                                <div id="app" className="content">
                                    <Root />
                                </div>
                                <Share visible={showShareButton} />
                            </SnackbarProvider>
                        </LoadingProvider>
                    </OldMuiThemeProvider>
                </MuiThemeProvider>
            </StylesProvider>
        );
    } else {
        return null;
    }
};

async function runMigrations(baseUrl) {
    const api = new D2ApiDefault({ baseUrl });
    axiosRetry(api.connection, { retries: 3 });
    const runner = await MigrationsRunner.init({ api, debug: console.debug });

    if (runner.hasPendingMigrations()) {
        return { type: "pending", runner };
    } else {
        return { type: "checked" };
    }
}

export default App;
