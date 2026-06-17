import { useEffect, useRef, useState } from "react";
import { DataSource } from "../../../../../domain/instance/entities/DataSource";
import { MetadataEntities } from "../../../../../domain/metadata/entities/MetadataEntities";
import { useAppContext } from "../../contexts/AppContext";
import { TableNotification } from "@eyeseetea/d2-ui-components";
import i18n from "../../../../../utils/i18n";

export function useSelection(
    collectionName: keyof MetadataEntities,
    ids: string[],
    selectedIds: string[],
    remoteInstance: DataSource | undefined,
    idsAreComplete: boolean
) {
    const { compositionRoot } = useAppContext();
    const [otherTypeCountFallback, setOtherTypeCountFallback] = useState(0);

    // When `ids` is not the full id list for the current type (filter active, or collection
    // never populates ids like organisationUnits), set-difference miscounts same-type
    // selections outside the filter as cross-type. Fall back to resolving types via the API.
    const shouldFetchCrossTypeData = !idsAreComplete;
    const idCollectionCache = useRef(new Map<string, string | null>());
    useEffect(() => {
        // Invalidate the cache when the resolution context changes (different instance or root).
        idCollectionCache.current.clear();
    }, [remoteInstance, compositionRoot]);

    useEffect(() => {
        if (!shouldFetchCrossTypeData || selectedIds.length === 0) {
            setOtherTypeCountFallback(0);
            return;
        }

        const selectedSet = new Set(selectedIds);
        idCollectionCache.current = new Map([...idCollectionCache.current].filter(([id]) => selectedSet.has(id)));
        const cache = idCollectionCache.current;
        const uncachedIds = selectedIds.filter(id => !cache.has(id));
        const countOtherType = () =>
            selectedIds.filter(id => {
                const col = cache.get(id);
                return col !== null && col !== collectionName;
            }).length;

        if (uncachedIds.length === 0) {
            setOtherTypeCountFallback(countOtherType());
            return;
        }

        let cancelled = false;
        compositionRoot.metadata.getByIds(uncachedIds, remoteInstance, "id").then(metadataByType => {
            if (cancelled) return;
            const resolved = new Map(
                Object.entries(metadataByType).flatMap(([col, items]) =>
                    (items ?? []).map(item => [item.id, col] as const)
                )
            );
            uncachedIds.forEach(id => cache.set(id, resolved.get(id) ?? null));
            setOtherTypeCountFallback(countOtherType());
        });

        return () => {
            cancelled = true;
        };
    }, [idsAreComplete, collectionName, selectedIds, compositionRoot, remoteInstance, shouldFetchCrossTypeData]);

    const idSet = ids.length > 0 ? new Set(ids) : undefined;
    const selection = (idSet ? selectedIds.filter(id => idSet.has(id)) : selectedIds).map(id => ({
        id,
        checked: true,
        indeterminate: false,
    }));

    const crossTypeCount = shouldFetchCrossTypeData
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
