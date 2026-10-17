import _ from "lodash";
import { Id } from "../../../common/entities/Schemas";
import { MetadataMappingDictionary } from "../../../mapping/entities/MetadataMapping";

export type WmrOrgUnit = Readonly<{ id: Id; path: string }>;

export type WmrDuplicatedTarget = Readonly<{ targetId: Id; orgUnitIds: ReadonlyArray<Id> }>;

export function getParentOrgUnits(orgUnits: ReadonlyArray<WmrOrgUnit>): ReadonlyArray<WmrOrgUnit> {
    const parents = orgUnits.flatMap(({ path }) => {
        const ids = path.split("/").filter(Boolean);
        const parentId = ids[ids.length - 2];
        return parentId ? [{ id: parentId, path: `/${ids.slice(0, -1).join("/")}` }] : [];
    });
    return _.uniqBy(parents, parent => parent.id);
}

export function findDuplicatedTargets(
    mapping: MetadataMappingDictionary["organisationUnits"] | undefined,
    orgUnitIds: ReadonlyArray<Id>
): ReadonlyArray<WmrDuplicatedTarget> {
    const mappedOrgUnits = orgUnitIds.flatMap(orgUnitId => {
        const targetId = mapping?.[orgUnitId]?.mappedId;
        return targetId ? [{ orgUnitId, targetId }] : [];
    });
    return _(mappedOrgUnits)
        .groupBy(({ targetId }) => targetId)
        .toPairs()
        .filter(([, sources]) => sources.length > 1)
        .map(([targetId, sources]) => ({ targetId, orgUnitIds: sources.map(({ orgUnitId }) => orgUnitId) }))
        .value();
}
