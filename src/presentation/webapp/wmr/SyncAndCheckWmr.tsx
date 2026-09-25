import React from "react";
import _ from "lodash";
import { useLoading } from "@eyeseetea/d2-ui-components";
import { Grid, Button, LinearProgress } from "@material-ui/core";
import { CloudDownload, SyncAlt as SyncAltIcon } from "@material-ui/icons";

import { Id } from "../../../domain/common/entities/Schemas";
import { useAppContext } from "../../react/core/contexts/AppContext";
import i18n from "../../../utils/i18n";
import { formatDateLong } from "../../../utils/date";
import { getWmrSyncedYear } from "../../../domain/entities/wmr/entities/WmrSyncFlow";
import { useWmrContext } from "./context/WmrContext";
import { useSyncLocalWmr, WmrLocalSyncResult } from "./hooks/useSyncLocalWmr";
import { AnalyticsFreshness, useAnalyticsFreshness } from "./hooks/useAnalyticsFreshness";
import { NoticeBox, NoticeBoxProps } from "./components/NoticeBox";
import { WmrFlowLabel } from "./components/WmrFlowLabel";

type SyncAndCheckWmrProps = {};

export function SyncAndCheckWmr(_props: SyncAndCheckWmrProps) {
    const { compositionRoot } = useAppContext();
    const { syncRule, settings } = useWmrContext();
    const { syncLocalWmr, wmrLocalSyncIsLoading, wmrLocalSyncResult } = useSyncLocalWmr();
    const loading = useLoading();
    const syncedYear = getWmrSyncedYear(new Date());
    if (!syncRule?.flow || !settings) {
        throw new Error("WMR Context should be initialized");
    }
    const { flow } = syncRule;
    const readsAnalytics = flow.source.periodType === "Monthly";
    const path = _(syncRule.rule.dataParams.orgUnitPaths).first() || "";

    const onDownload = async () => {
        loading.show();
        await compositionRoot.rules.downloadPayloads({
            kind: "syncRule",
            syncRule: syncRule.rule,
        });
        loading.hide();
    };

    return (
        <Grid container spacing={1} style={{ height: "70vh" }}>
            {readsAnalytics && (
                <Grid item xs={12}>
                    <AnalyticsFreshnessNotice />
                </Grid>
            )}
            <Grid item xs={12}>
                <WmrFlowLabel flow={flow} />
            </Grid>
            {!wmrLocalSyncResult && (
                <Grid item xs={12}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={syncLocalWmr}
                        endIcon={<SyncAltIcon />}
                        disabled={wmrLocalSyncIsLoading}
                    >
                        {i18n.t("Sync WMR Country Dataset")}
                    </Button>
                    <Button
                        variant="outlined"
                        color="default"
                        onClick={onDownload}
                        endIcon={<CloudDownload />}
                        disabled={wmrLocalSyncIsLoading}
                        style={{ marginLeft: "1em" }}
                    >
                        {i18n.t("Download DataValues")}
                    </Button>
                </Grid>
            )}
            <Grid item xs={12} style={{ height: "100%" }}>
                {wmrLocalSyncIsLoading && (
                    <LinearProgress color="primary" style={{ position: "absolute", width: "100%" }} />
                )}
                {wmrLocalSyncResult && (
                    <NoticeBox type={wmrLocalSyncResult.type} message={describeWmrLocalSync(wmrLocalSyncResult)} />
                )}
                {wmrLocalSyncResult && wmrLocalSyncResult.type !== "error" && path && (
                    <DataEntry
                        dataSetId={flow.destination.id}
                        orgUnitId={_(path).split("/").last() || ""}
                        period={syncedYear.toString()}
                    />
                )}
            </Grid>
        </Grid>
    );
}

function describeWmrLocalSync(result: WmrLocalSyncResult): string {
    switch (result.type) {
        case "error":
            return `${i18n.t("Failed to synchronize WMR data")} ${result.message}`;
        case "warning":
            return `${result.message} ${i18n.t("You can still complete the WMR form manually.")}`;
        case "success":
        case "info":
            return result.message;
    }
}

function AnalyticsFreshnessNotice() {
    const analyticsFreshness = useAnalyticsFreshness();
    const { type, message } = describeAnalyticsFreshness(analyticsFreshness);

    return <NoticeBox type={type} message={message} />;
}

function describeAnalyticsFreshness(freshness: AnalyticsFreshness): {
    type: NoticeBoxProps["type"];
    message: string;
} {
    switch (freshness.type) {
        case "loading":
            return { type: "loading", message: i18n.t("Checking when analytics tables were last generated...") };
        case "lastRun":
            return {
                type: "info",
                message: i18n.t(
                    "Analytics tables were last generated on {{date}}. This sync reads those tables, so data captured after that moment is not included.",
                    { date: formatDateLong(freshness.date) }
                ),
            };
        case "neverRun":
            return {
                type: "info",
                message: i18n.t(
                    "Analytics tables have never been generated on this server. This sync reads those tables, so it will not find any data until analytics runs."
                ),
            };
        case "unknown":
            return {
                type: "info",
                message: i18n.t(
                    "Could not determine when analytics tables were last generated. This sync reads those tables, so data captured after the last analytics run is not included."
                ),
            };
    }
}

type DataEntryProps = { dataSetId: Id; orgUnitId: Id; period: string };

export function DataEntry(props: DataEntryProps) {
    const { dataSetId, orgUnitId, period } = props;
    const { api } = useAppContext();
    const [status, setStatus] = React.useState<"idle" | "loaded">("idle");
    const iframeRef = React.useRef<HTMLIFrameElement>(null);

    React.useEffect(() => {
        const currentWindow = iframeRef.current?.contentWindow;

        function onLoad() {
            const document = currentWindow?.document;
            if (!document) return;

            mutateDom(document, "#currentSelection", el => el.remove());
            mutateDom(document, "#header", el => el.remove());
            mutateDom(document, "#leftBar", el => (el.style.display = "none"));
            mutateDom(document, "#selectionBox", el => (el.style.display = "none"));
            mutateDom(document, "body", el => (el.style.marginTop = "-55px"));
            mutateDom(document, "#mainPage", el => (el.style.margin = "65px 10px 10px 10px"));
            mutateDom(document, "#completenessDiv", el => el.remove());
            mutateDom(document, "#moduleHeader", el => el.remove());
            mutateDom(document, "#actions", el => el.remove());
            setStatus("loaded");
        }

        if (currentWindow) {
            currentWindow.addEventListener("load", onLoad);
            if (currentWindow.document?.readyState === "complete") onLoad();
        }

        return () => {
            currentWindow?.removeEventListener("load", onLoad);
        };
    }, []);

    React.useEffect(() => {
        const currentWindow = iframeRef.current?.contentWindow as (Window & DataEntryWindow) | null;
        if (!currentWindow) return;

        async function setSelectedOption(selector: string, value: string) {
            if (!currentWindow) return;
            await waitFor(() => {
                const select = currentWindow.document.querySelector<HTMLSelectElement>(selector);
                return select && select.options.length > 0;
            });
            const select = currentWindow.document.querySelector<HTMLSelectElement>(selector);
            if (!select) return;
            select.value = value;
            const stubEvent = new Event("stub");
            if (select.onchange) {
                select.onchange(stubEvent);
            }
        }

        async function getStatusAndSetValues() {
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (status === "loaded" && currentWindow) {
                currentWindow.selection.select(orgUnitId);

                await setSelectedOption("#selectedDataSetId", dataSetId);
                await setSelectedOption("#selectedPeriodId", period);
            }
        }

        getStatusAndSetValues();
    }, [status, dataSetId, period, orgUnitId]);

    return (
        <>
            {status !== "loaded" && <LinearProgress color="primary" />}
            <iframe
                className="mds-data-entry"
                height="100%"
                width="100%"
                ref={iframeRef}
                src={`${api.baseUrl}/dhis-web-dataentry/index.action`}
                title="WMR - Data Entry"
            />
        </>
    );
}

interface DataEntryWindow {
    dhis2: {
        de: {
            currentPeriodOffset: number;
            storageManager: { formExists: (dataSetId: string) => boolean };
        };
        util: { on: Function };
    };
    displayPeriods: () => void;
    selection: { select: (orgUnitId: string) => void; isBusy(): boolean };
}

function mutateDom<T extends HTMLElement>(document: Document, selector: string, action: (el: T) => void) {
    const el = document.querySelector(selector) as T;
    if (el) action(el);
}

function waitFor(callback: () => boolean | null, timeoutMs = 10_000) {
    return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            clearInterval(interval);
            reject(new Error("waitFor: timeout exceeded"));
        }, timeoutMs);

        const interval = setInterval(() => {
            try {
                if (callback()) {
                    clearTimeout(timeout);
                    clearInterval(interval);
                    resolve();
                }
            } catch (e) {
                // Ignore errors from arg0 until timeout
            }
        }, 100);
    });
}
