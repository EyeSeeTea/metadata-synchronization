import memoize from "nano-memoize";
import { Id } from "../../../../../domain/common/entities/Schemas";
import { Ref } from "../../../../../domain/common/entities/Ref";
import { MetadataEntities } from "../../../../../domain/metadata/entities/MetadataEntities";
import { modelFactory } from "../../../../../models/dhis/factory";
import { D2Api } from "../../../../../types/d2-api";
import _ from "lodash";

/**
 * Load memoized filter data from an instance (This should be removed with a cache on d2-api)
 * Note: _baseUrl is used as cacheKey to avoid memoizing values between instances
 */
export const getFilterData = memoize(
    (modelName: keyof MetadataEntities, type: "group" | "level", _baseUrl: string, api: D2Api) =>
        modelFactory(modelName)
            .getApiModel(api)
            .get({
                paging: false,
                fields:
                    type === "group"
                        ? {
                              id: true as const,
                              name: true as const,
                          }
                        : {
                              name: true as const,
                              level: true as const,
                          },
                order: type === "group" ? undefined : `level:iasc`,
            })
            .getData(),
    { maxArgs: 3 }
);

export async function getOrgUnitSubtree(api: D2Api, orgUnitId: string): Promise<string[]> {
    const { organisationUnits } = (await api
        .get(`/organisationUnits/${orgUnitId}`, { fields: "id", includeDescendants: true })
        .getData()) as { organisationUnits: { id: string }[] };

    return organisationUnits.map(({ id }) => id);
}

export function getMergedSelection({
    included,
    otherTypeIds,
}: {
    included: string[];
    otherTypeIds: string[];
}): string[] {
    return _.uniq([...otherTypeIds, ...included]);
}

const isRef = (value: unknown): value is Ref => _.isString(_.get(value, "id"));

export function getChildrenIds(objects: ReadonlyArray<object>, childrenKeys: ReadonlyArray<string>): Id[] {
    return _.flattenDeep(objects.map(object => _.values(_.pick(object, childrenKeys))))
        .filter(isRef)
        .map(({ id }) => id);
}
