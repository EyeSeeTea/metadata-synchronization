import React from "react";
import { Grid, Typography } from "@material-ui/core";
import { Dropdown } from "@eyeseetea/d2-ui-components";
import i18n from "../../../utils/i18n";
import InstanceMappingPage from "../core/pages/instance-mapping/InstanceMappingPage";
import { WmrSettings } from "../../../domain/entities/wmr/entities/WmrSettings";
import { Id } from "../../../domain/common/entities/Schemas";
import { useWmrContext } from "./context/WmrContext";
import { Maybe } from "../../../types/utils";

type MapWmrDataProps = {};

export function MapWmrData(_props: MapWmrDataProps) {
    const { syncRule, settings, loadSettings } = useWmrContext();
    const [dataSetId, setDataSetId] = React.useState<Maybe<Id>>(syncRule?.localDataSetId);

    React.useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    if (!settings || !syncRule) {
        return <Typography>{i18n.t("Loading settings...")}</Typography>;
    }

    const dataSets = settings.dataSets.map(dataSet => {
        return { text: dataSet.name, value: dataSet.id };
    });

    const onChangeDataSet = (value: Id | undefined) => {
        setDataSetId(value);
        syncRule.localDataSetId = value;
    };

    const allowedLocalDataElementsIds = settings.getDataElementsIds(dataSetId);

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Typography>
                    {i18n.t("Select a DataSet. Then map your server data to the newly created test WMR form")}
                </Typography>
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
                        filterRows={allowedLocalDataElementsIds}
                        filterMappingIds={settings.countryDataElementsIds}
                    />
                </Grid>
            )}
        </Grid>
    );
}
