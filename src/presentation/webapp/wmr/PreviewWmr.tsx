import React from "react";
import _ from "lodash";
import { useLoading } from "@eyeseetea/d2-ui-components";
import { Grid, Button, Typography } from "@material-ui/core";
import { CloudDownload } from "@material-ui/icons";

import { Id } from "../../../domain/common/entities/Schemas";
import { WmrSettings } from "../../../domain/entities/wmr/entities/WmrSettings";
import { SynchronizationRule } from "../../../domain/rules/entities/SynchronizationRule";
import { useAppContext } from "../../react/core/contexts/AppContext";
import i18n from "../../../types/i18n";

type PreviewWmrProps = { settings: WmrSettings; syncRule: SynchronizationRule };

export function PreviewWmr(props: PreviewWmrProps) {
    const { compositionRoot } = useAppContext();
    const { syncRule, settings } = props;
    const loading = useLoading();

    const path = _(syncRule.dataParams.orgUnitPaths).first() || "";

    const onDownload = async () => {
        loading.show();
        await compositionRoot.rules.downloadPayloads({
            kind: "syncRule",
            syncRule: syncRule,
        });
        loading.hide();
    };

    if (!path) return <Typography variant="h4">{i18n.t("Select a organisation unit in the previous step")}</Typography>;

    return (
        <Grid container spacing={1} style={{ height: "100vh" }}>
            <Grid item xs={12}>
                <Button variant="contained" color="primary" onClick={onDownload} endIcon={<CloudDownload />}>
                    {i18n.t("Download DataValues")}
                </Button>
            </Grid>
            <Grid item xs={12} style={{ height: "100%" }}>
                <DataEntry
                    dataSetId={settings.countryDataSetId}
                    orgUnitId={_(path).split("/").last() || ""}
                    period={(new Date().getFullYear() - 1).toString()}
                />
            </Grid>
        </Grid>
    );
}

type DataEntryProps = { dataSetId: Id; orgUnitId: Id; period: string };

export function DataEntry(props: DataEntryProps) {
    const { dataSetId, orgUnitId, period } = props;
    const { api } = useAppContext();
    const loading = useLoading();
    const [status, setStatus] = React.useState<"idle" | "loaded">("idle");
    const iframeRef = React.useRef<HTMLIFrameElement>(null);

    React.useEffect(() => {
        const currentWindow = iframeRef.current?.contentWindow;

        function onLoad() {
            if (currentWindow?.document) {
                mutateDom(currentWindow.document, "#currentSelection", el => el.remove());
                mutateDom(currentWindow.document, "#header", el => el.remove());
                mutateDom(currentWindow.document, "#leftBar", el => (el.style.display = "none"));
                mutateDom(currentWindow.document, "#selectionBox", el => (el.style.display = "none"));
                mutateDom(currentWindow.document, "body", el => (el.style.marginTop = "-55px"));
                mutateDom(currentWindow.document, "#mainPage", el => (el.style.margin = "65px 10px 10px 10px"));
                mutateDom(currentWindow.document, "#completenessDiv", el => el.remove());
                mutateDom(currentWindow.document, "#moduleHeader", el => el.remove());
                mutateDom(currentWindow.document, "#actions", el => el.remove());
                setStatus("loaded");
            }
        }

        if (currentWindow) {
            loading.show();
            currentWindow.addEventListener("load", onLoad);
        }

        return () => {
            currentWindow?.removeEventListener("load", onLoad);
            loading.hide();
        };
    }, [loading]);

    React.useEffect(() => {
        const currentWindow = iframeRef.current?.contentWindow as (Window & DataEntryWindow) | null;
        if (!currentWindow) return;

        async function getStatusAndSetValues() {
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (status === "loaded" && currentWindow) {
                currentWindow.selection.select(orgUnitId);

                await new Promise(resolve => setTimeout(resolve, 1000));

                const dataSetSelector = currentWindow.document.querySelector<HTMLSelectElement>("#selectedDataSetId");
                if (!dataSetSelector) return;
                dataSetSelector.value = dataSetId;
                const stubEvent = new Event("stub");
                if (dataSetSelector.onchange) {
                    dataSetSelector.onchange(stubEvent);
                }

                await new Promise(resolve => setTimeout(resolve, 1000));

                const periodSelector = currentWindow.document.querySelector<HTMLSelectElement>("#selectedPeriodId");
                if (!periodSelector) return;
                periodSelector.value = period;
                if (periodSelector.onchange) {
                    periodSelector.onchange(stubEvent);
                }
                loading.hide();
            }
        }

        getStatusAndSetValues();
    }, [status, dataSetId, period, orgUnitId, loading]);

    return (
        <iframe
            className="mds-data-entry"
            height="100%"
            width="100%"
            ref={iframeRef}
            src={`${api.baseUrl}/dhis-web-dataentry/index.action`}
            title="WMR - Data Entry"
        />
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
