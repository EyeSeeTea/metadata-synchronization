import _ from "lodash";
import React from "react";
import { useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";
import { Id } from "../../../../domain/common/entities/Schemas";
import { useAppContext } from "../../../react/core/contexts/AppContext";
import { WmrSettings } from "../../../../domain/entities/wmr/entities/WmrSettings";
import { Maybe } from "../../../../types/utils";

/**
 * Keep the global mapping store intact, but scope the IDs used by a WMR sync
 * to the data elements and indicators that belong to the selected source data set.
 */
export function filterMappedDataElementIds(
    mappedDataElementIds: ReadonlyArray<Id>,
    dataSetDataElementIds: ReadonlyArray<Id>
): Id[] {
    const dataSetDataElementIdsSet = new Set(dataSetDataElementIds);
    return mappedDataElementIds.filter(dataElementId => dataSetDataElementIdsSet.has(dataElementId));
}

export type WmrSyncIds = Readonly<{
    metadataIds: Id[];
    mappedIndicatorIds: Id[];
}>;

export function getWmrSyncIds(
    settings: WmrSettings,
    sourceDataSetId: Maybe<Id>,
    mappedIds: ReadonlyArray<Id>
): WmrSyncIds {
    const indicatorIds = settings.getIndicatorsIds(sourceDataSetId);
    const metadataIds = filterMappedDataElementIds(mappedIds, settings.getSourceMetadataIds(sourceDataSetId));
    return { metadataIds, mappedIndicatorIds: filterMappedDataElementIds(metadataIds, indicatorIds) };
}

export function useMappingDataElements(
    dataElementsFrom: "LOCAL" | "REMOTE",
    sourceDataElementIds?: ReadonlyArray<Id>
) {
    const { compositionRoot } = useAppContext();
    const [dataElementsToMigrate, setDataElementsToMigrate] = React.useState<Id[]>([]);
    const loading = useLoading();
    const snackbar = useSnackbar();

    React.useEffect(() => {
        async function getInstance() {
            loading.show();
            const instanceResult = await compositionRoot.instances.getById(WmrSettings.LOCAL_INSTANCE_ID);

            instanceResult.match({
                error: () => {
                    snackbar.error("Failed to load LOCAL instance");
                    loading.hide();
                },
                success: async instance => {
                    const dataSourceMapping = await compositionRoot.mapping.get({ type: "instance", id: instance.id });
                    const mapping = dataSourceMapping?.mappingDictionary ?? {};
                    const selectedMappings = _(mapping.aggregatedDataElements)
                        .toPairs()
                        .filter(([sourceDataElementId]) =>
                            sourceDataElementIds ? sourceDataElementIds.includes(sourceDataElementId) : true
                        )
                        .value();
                    const dataElementsIds =
                        dataElementsFrom === "LOCAL"
                            ? selectedMappings.map(([sourceDataElementId]) => sourceDataElementId)
                            : _(selectedMappings)
                                  .map(([, mapping]) => mapping.mappedId)
                                  .compact()
                                  .value();
                    setDataElementsToMigrate(dataElementsIds);
                    loading.hide();
                },
            });
        }

        getInstance();
    }, [compositionRoot, dataElementsFrom, loading, snackbar, sourceDataElementIds]);

    return { dataElementsToMigrate };
}
