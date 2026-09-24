import { useLoading } from "@eyeseetea/d2-ui-components";
import React from "react";
import { SynchronizationReport } from "../../../../domain/reports/entities/SynchronizationReport";
import { SynchronizationResult } from "../../../../domain/reports/entities/SynchronizationResult";
import { useAppContext } from "../../../react/core/contexts/AppContext";
import { useWmrContext } from "../context/WmrContext";
import i18n from "../../../../utils/i18n";
import { getWmrAggregationSettings } from "../../../../domain/entities/wmr/entities/WmrSyncFlow";
import { filterMappedDataElementIds, useGetDataSetOrgUnits, useMappingDataElements } from "./useMappingDataElements";

export type WmrLocalSyncResult = Readonly<{
    type: "success" | "info" | "warning" | "error";
    message: string;
}>;

export function summarizeWmrLocalSync(report?: SynchronizationReport): WmrLocalSyncResult {
    if (!report) {
        return { type: "error", message: i18n.t("Synchronization did not return a report.") };
    }

    const results = report.getResults();
    const failedResult = results.find(
        (result: SynchronizationResult) =>
            result.status === "ERROR" || result.status === "NETWORK ERROR" || !!result.errors?.length
    );
    if (report.status === "FAILURE" || failedResult) {
        return {
            type: "error",
            message: failedResult?.message ?? i18n.t("Synchronization failed."),
        };
    }

    const { imported, updated, ignored } = results.reduce(
        (totals, { stats }) => ({
            imported: totals.imported + (stats?.imported ?? 0),
            updated: totals.updated + (stats?.updated ?? 0),
            ignored: totals.ignored + (stats?.ignored ?? 0),
        }),
        { imported: 0, updated: 0, ignored: 0 }
    );

    if (imported + updated > 0) {
        return {
            type: "success",
            message: i18n.t("{{imported}} created, {{updated}} updated, {{ignored}} unchanged", {
                imported,
                updated,
                ignored,
            }),
        };
    }
    if (ignored > 0) {
        return { type: "info", message: i18n.t("The {{ignored}} values were already up to date", { ignored }) };
    }
    return {
        type: "warning",
        message: i18n.t("There are no values for the mapped data elements in the period"),
    };
}

export function useSyncLocalWmr() {
    const { compositionRoot } = useAppContext();
    const { settings, syncRule } = useWmrContext();
    const { dataElementsToMigrate } = useMappingDataElements("LOCAL");
    const loading = useLoading();
    const { dataSet: countryDataSet } = useGetDataSetOrgUnits({ id: syncRule?.destination?.id || "" });

    const [wmrLocalSyncResult, setWmrLocalSyncResult] = React.useState<WmrLocalSyncResult | null>(null);

    const syncLocalWmr = React.useCallback(async () => {
        if (!settings || !syncRule?.destination || !countryDataSet) {
            throw new Error("WMR settings, sync rule or destination not found");
        }

        const selectedDataSetDataElementIds = settings.getDataElementsIds(syncRule.localDataSetId);
        const selectedDataSetMappedDataElementIds = filterMappedDataElementIds(
            dataElementsToMigrate,
            selectedDataSetDataElementIds
        );
        if (!selectedDataSetMappedDataElementIds.length) {
            setWmrLocalSyncResult({
                type: "error",
                message: i18n.t("No mapped data elements found for the selected data set."),
            });
            return;
        }

        const { enableAggregation, aggregationType } = getWmrAggregationSettings(syncRule.destination.periodType);
        const syncRuleUpdated = syncRule.rule
            .updateBuilder({ metadataIds: selectedDataSetMappedDataElementIds })
            .updateDataSyncEnableAggregation(enableAggregation)
            .updateDataSyncAggregationType(aggregationType)
            // TODO: This is a shortcut to get the root org unit, which is the same as the country WMR dataset.
            .updateDataSyncOrgUnitPaths(countryDataSet.orgUnits.map(ou => ou.path));

        loading.show();
        const result = await compositionRoot.sync.prepare(syncRuleUpdated.type, syncRuleUpdated.toBuilder());
        const sync = compositionRoot.wmr.syncDataset(syncRuleUpdated.toBuilder());

        const synchronize = async () => {
            for await (const { message, syncReport, done } of sync.execute()) {
                if (message) loading.show(true, message);
                if (syncReport) await compositionRoot.reports.save(syncReport);
                if (done) {
                    loading.hide();
                    return syncReport;
                }
            }
        };

        await result.match({
            success: async () => {
                // TODO: Error handling here?
                const report = await synchronize();
                const localSyncResult = summarizeWmrLocalSync(report);
                if (localSyncResult.type === "error") {
                    loading.hide();
                    setWmrLocalSyncResult(localSyncResult);
                    return;
                }
                syncRule.rule = syncRuleUpdated;
                setWmrLocalSyncResult(localSyncResult);
            },
            error: async code => {
                loading.hide();
                setWmrLocalSyncResult({
                    type: "error",
                    message: `${i18n.t("Failed to prepare synchronization rule")}: ${code}`,
                });
            },
        });
    }, [
        compositionRoot.reports,
        compositionRoot.sync,
        compositionRoot.wmr,
        countryDataSet,
        dataElementsToMigrate,
        loading,
        settings,
        syncRule,
    ]);

    return {
        syncLocalWmr,
        wmrLocalSyncIsLoading: loading.isLoading,
        wmrLocalSyncResult,
    };
}
