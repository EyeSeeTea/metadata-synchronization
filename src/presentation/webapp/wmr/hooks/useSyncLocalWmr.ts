import { useLoading } from "@eyeseetea/d2-ui-components";
import React from "react";
import { SynchronizationReport } from "../../../../domain/reports/entities/SynchronizationReport";
import { SynchronizationResult } from "../../../../domain/reports/entities/SynchronizationResult";
import { useAppContext } from "../../../react/core/contexts/AppContext";
import { useWmrContext } from "../context/WmrContext";
import i18n from "../../../../utils/i18n";
import {
    filterMappedDataElementIds,
    useGetDataSetOrgUnits,
    useMappingDataElements,
} from "./useMappingDataElements";

export type WmrLocalSyncResult =
    | {
          type: "success";
          transferred: number;
      }
    | {
          type: "warning";
          message: string;
          transferred: number;
      }
    | {
          type: "error";
          message: string;
      };

export function summarizeWmrLocalSync(report?: SynchronizationReport): WmrLocalSyncResult {
    if (!report) {
        return { type: "error", message: "Synchronization did not return a report." };
    }

    const results = report.getResults();
    const failedResult = results.find(
        (result: SynchronizationResult) =>
            result.status === "ERROR" || result.status === "NETWORK ERROR" || !!result.errors?.length
    );
    if (report.status === "FAILURE" || failedResult) {
        return {
            type: "error",
            message: failedResult?.message ?? "Synchronization failed.",
        };
    }

    const transferred = results.reduce(
        (total, result) => total + (result.stats?.imported ?? 0) + (result.stats?.updated ?? 0),
        0
    );
    if (!transferred) {
        return {
            type: "warning",
            message: "Synchronization completed, but no data values were transferred.",
            transferred,
        };
    }

    return { type: "success", transferred };
}

export function useSyncLocalWmr() {
    const { compositionRoot } = useAppContext();
    const { settings, syncRule } = useWmrContext();
    const { dataElementsToMigrate } = useMappingDataElements("LOCAL");
    const loading = useLoading();
    const { dataSet: countryDataSet } = useGetDataSetOrgUnits({ id: settings?.countryDataSetId || "" });

    const [wmrLocalSyncResult, setWmrLocalSyncResult] = React.useState<WmrLocalSyncResult | null>(null);

    const syncLocalWmr = React.useCallback(async () => {
        if (!settings || !syncRule || !countryDataSet) {
            throw new Error("WMR settings or sync rule not found");
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

        const syncRuleUpdated = syncRule.rule
            .updateBuilder({ metadataIds: selectedDataSetMappedDataElementIds })
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
                    message: `Failed to prepare synchronization rule: ${code}`,
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
