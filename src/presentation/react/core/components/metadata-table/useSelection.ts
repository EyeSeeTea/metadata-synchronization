import { useEffect, useState } from "react";
import { DataSource } from "../../../../../domain/instance/entities/DataSource";
import { MetadataEntities } from "../../../../../domain/metadata/entities/MetadataEntities";
import { useAppContext } from "../../contexts/AppContext";
import { TableNotification } from "@eyeseetea/d2-ui-components";
import i18n from "../../../../../utils/i18n";
import _ from "lodash";

export function useSelection(
    collectionName: keyof MetadataEntities,
    ids: string[],
    selectedIds: string[],
    remoteInstance: DataSource | undefined,
    filterRestrictsIds: boolean
) {
    const { compositionRoot } = useAppContext();
    const [otherTypeCountFallback, setOtherTypeCountFallback] = useState(0);

    // `ids` cannot be used to tell cross-type selections apart by set difference when it is
    // not the current type's full id list: never loaded for organisationUnits, and narrowed
    // to matching rows when a filter (search/group/level/...) is active. In those cases
    // same-type selections outside the filter would be miscounted as cross-type, so resolve
    // the selection's types via the API and count items in any collection other than the
    // current one.
    const useApiCrossTypeCount = collectionName === "organisationUnits" || filterRestrictsIds;

    useEffect(() => {
        if (!useApiCrossTypeCount || selectedIds.length === 0) {
            setOtherTypeCountFallback(0);
            return;
        }

        let cancelled = false;
        compositionRoot.metadata.getByIds(selectedIds, remoteInstance, "id").then(pkg => {
            if (!cancelled) setOtherTypeCountFallback(countPackageOtherType(pkg, collectionName));
        });

        return () => {
            cancelled = true;
        };
    }, [useApiCrossTypeCount, collectionName, selectedIds, compositionRoot, remoteInstance]);

    const idSet = ids.length > 0 ? new Set(ids) : undefined;
    const selection = (idSet ? selectedIds.filter(id => idSet.has(id)) : selectedIds).map(id => ({
        id,
        checked: true,
        indeterminate: false,
    }));

    const crossTypeCount = useApiCrossTypeCount
        ? otherTypeCountFallback
        : idSet
        ? selectedIds.filter(id => !idSet.has(id)).length
        : 0;
    const crossTypeNotifications: TableNotification[] =
        crossTypeCount > 0
            ? [
                  {
                      message: i18n.t("{{count}} items are selected in other metadata types.", {
                          count: crossTypeCount,
                      }),
                  },
              ]
            : [];

    return { selection, crossTypeNotifications };
}

function countPackageOtherType(pkg: Partial<Record<string, unknown[]>>, currentCollection: string): number {
    return _.sumBy(Object.entries(pkg), ([collection, items]) =>
        collection === currentCollection || !items ? 0 : items.length
    );
}
