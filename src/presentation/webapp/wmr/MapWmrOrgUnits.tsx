import React from "react";
import { Button, Grid } from "@material-ui/core";
import { OrgUnitsSelector, useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";

import i18n from "../../../types/i18n";
import { useAppContext } from "../../react/core/contexts/AppContext";
import { useGetDataSetOrgUnits, useMappingDataElements } from "./hooks/useMappingDataElements";
import { WmrSettings } from "../../../domain/entities/wmr/entities/WmrSettings";
import { WmrSyncRule } from "./WmrPage";
import { WmrDataSet } from "../../../domain/entities/wmr/entities/WmrDataSet";
import { Alert } from "@material-ui/lab";

const orgUnitControls = {
    filterByLevel: false,
    filterByGroup: false,
    filterByProgram: false,
    selectAll: false,
};

type MapWmrOrgUnitsProps = { settings: WmrSettings; wmrSyncRule: WmrSyncRule };

export function MapWmrOrgUnits(props: MapWmrOrgUnitsProps) {
    const { settings, wmrSyncRule } = props;
    const { api, compositionRoot } = useAppContext();
    const loading = useLoading();
    const snackbar = useSnackbar();
    const [selectedOrgUnits, updateOrgUnits] = React.useState<string[]>([]);
    const { dataElementsToMigrate } = useMappingDataElements();
    const { dataSet: localDataSet } = useGetDataSetOrgUnits({ id: wmrSyncRule.localDataSetId || "" });
    const { dataSet: countryDataSet } = useGetDataSetOrgUnits({ id: settings.countryDataSetId || "" });

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (selectedOrgUnits.length === 0) {
            snackbar.warning(i18n.t("Please select an Org. Unit"));
            return;
        }

        const syncRuleUpdated = wmrSyncRule.rule
            .updateBuilder({ metadataIds: dataElementsToMigrate })
            .updateDataSyncOrgUnitPaths(selectedOrgUnits);

        loading.show();
        const result = await compositionRoot.sync.prepare(syncRuleUpdated.type, syncRuleUpdated.toBuilder());
        const sync = compositionRoot.sync[syncRuleUpdated.type](syncRuleUpdated.toBuilder());

        const synchronize = async () => {
            for await (const { message, syncReport, done } of sync.execute()) {
                if (message) loading.show(true, message);
                if (syncReport) await compositionRoot.reports.save(syncReport);
                if (done) {
                    loading.hide();
                    return;
                }
            }
        };

        await result.match({
            success: async () => {
                await synchronize();
                wmrSyncRule.rule = syncRuleUpdated;
                snackbar.success(i18n.t("Data sent to new DataSet. Click Next to see the data imported"));
            },
            error: async code => {
                snackbar.error(code);
            },
        });
    }

    const onOrgUnitChange = (orgUnitsPaths: string[]) => {
        updateOrgUnits(orgUnitsPaths);
    };

    const orgUnitsDifference =
        localDataSet && countryDataSet ? WmrDataSet.getDifferenceOrgsUnits(localDataSet, countryDataSet) : [];

    return (
        <form onSubmit={onSubmit}>
            <Grid container spacing={3}>
                {orgUnitsDifference.length > 0 && (
                    <Grid item xs={12}>
                        <Alert severity="warning">
                            {i18n.t("Org. Unit: {{orgUnitsNames}} are not assigned to the Country DataSet", {
                                orgUnitsNames: orgUnitsDifference.map(ou => ou.name).join(", "),
                                nsSeparator: false,
                            })}
                        </Alert>
                    </Grid>
                )}
                <Grid item xs={12}>
                    <OrgUnitsSelector
                        api={api}
                        controls={orgUnitControls}
                        onChange={onOrgUnitChange}
                        selected={selectedOrgUnits}
                        singleSelection
                        selectableIds={localDataSet ? WmrDataSet.getOrgUnitsIds(localDataSet) : undefined}
                    />
                </Grid>
                <Grid item xs={12}>
                    <Button variant="contained" color="primary" type="submit">
                        {i18n.t("Send data to new DataSet")}
                    </Button>
                </Grid>
            </Grid>
        </form>
    );
}
