import _ from "lodash";
import React from "react";
import { useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";
import { Id } from "../../../../domain/common/entities/Schemas";
import { useAppContext } from "../../../react/core/contexts/AppContext";
import { WmrSettings } from "../../../../domain/entities/wmr/entities/WmrSettings";

export function useMappingDataElements() {
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
                    const dataElementsIds = _(mapping.aggregatedDataElements).keys().value();
                    setDataElementsToMigrate(dataElementsIds);
                    loading.hide();
                },
            });
        }

        getInstance();
    }, [compositionRoot, loading, snackbar]);

    return { dataElementsToMigrate };
}
