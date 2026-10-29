import React from "react";
import { Grid } from "@material-ui/core";
import { Dropdown } from "@eyeseetea/d2-ui-components";
import i18n from "../../../utils/i18n";
import InstanceMappingPage from "../core/pages/instance-mapping/InstanceMappingPage";
import { WmrSettings } from "../../../domain/entities/wmr/entities/WmrSettings";
import { Id } from "../../../domain/common/entities/Schemas";
import { useWmrContext } from "./context/WmrContext";
import { Maybe } from "../../../types/utils";
import { NoticeBox } from "./components/NoticeBox";

type MapWmrDataProps = {};

export function MapWmrData(_props: MapWmrDataProps) {
    const { syncRule, settings, loadSettings, flowKind, setRegionalPrepared } = useWmrContext();
    const [dataSetId, setDataSetId] = React.useState<Maybe<Id>>(syncRule?.localDataSetId);

    React.useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    React.useEffect(() => {
        setRegionalPrepared(false);
    }, [setRegionalPrepared]);

    if (!settings || !syncRule) {
        return <NoticeBox type="loading" message={i18n.t("Loading settings...")} />;
    }

    const sources = flowKind ? settings.getSelectableSources(flowKind) : [];
    const dataSets = sources.map(dataSet => ({
        text: `${dataSet.name} (${dataSet.periodType})`,
        value: dataSet.id,
    }));

    const onChangeDataSet = (value: Id | undefined) => {
        setDataSetId(value);
        syncRule.localDataSetId = value;
        syncRule.flow = flowKind && settings.getFlowFor(value, flowKind);
        setRegionalPrepared(false);
    };

    const allowedLocalIds = settings.getSourceMetadataIds(dataSetId);

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <NoticeBox
                    type="info"
                    message={i18n.t("Select a DataSet. Then map your local data to the WMR Form data")}
                />
            </Grid>
            <Grid item xs={12}>
                <Dropdown
                    items={dataSets}
                    label={i18n.t("Select a DataSet")}
                    onChange={onChangeDataSet}
                    value={dataSetId ?? ""}
                />
            </Grid>
            {dataSetId && (
                <Grid item xs={12}>
                    <InstanceMappingPage
                        instanceId={WmrSettings.LOCAL_INSTANCE_ID}
                        section="aggregated"
                        showHeader={false}
                        filterRows={allowedLocalIds}
                        filterMappingIds={[...(syncRule.flow?.destination.dataElementsIds ?? [])]}
                        applyFilterMappingIdsToAutoMap
                        onChange={() => setRegionalPrepared(false)}
                    />
                </Grid>
            )}
        </Grid>
    );
}
