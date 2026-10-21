import _ from "lodash";
import { Id } from "../../../common/entities/Schemas";
import { MetadataMappingDictionary } from "../../../mapping/entities/MetadataMapping";
import { Maybe } from "../../../../types/utils";

export type WmrOrgUnit = Readonly<{ id: Id; path: string }>;

export type WmrNamedOrgUnit = WmrOrgUnit & Readonly<{ name: string }>;

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
    mapping: Maybe<MetadataMappingDictionary["organisationUnits"]>,
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

export type WmrLevelOrgUnit = WmrNamedOrgUnit & Readonly<{ level: number }>;

export type WmrOrgUnitLevel = Readonly<{ level: number; name: string; count: number }>;

export type WmrLevelAssignment = Readonly<{
    level: number;
    orgUnits: ReadonlyArray<WmrLevelOrgUnit>;
    parents: ReadonlyArray<WmrLevelOrgUnit>;
}>;

export const wmrMinAssignableLevel = 3;

export function getAssignableLevels(levels: ReadonlyArray<WmrOrgUnitLevel>): ReadonlyArray<WmrOrgUnitLevel> {
    return levels.filter(({ level }) => level >= wmrMinAssignableLevel);
}

export function getSingleLevel(orgUnits: ReadonlyArray<WmrLevelOrgUnit>): number | undefined {
    const levels = _.uniq(orgUnits.map(({ level }) => level));
    return levels.length === 1 ? levels[0] : undefined;
}

export function buildWmrLevelAssignment(
    level: number,
    orgUnits: ReadonlyArray<WmrLevelOrgUnit>,
    parentLevelOrgUnits: ReadonlyArray<WmrLevelOrgUnit>
): WmrLevelAssignment {
    const parentsById = _.keyBy(parentLevelOrgUnits, ({ id }) => id);
    const parents = getParentOrgUnits(orgUnits).flatMap(({ id }) => {
        const parent = parentsById[id];
        return parent ? [parent] : [];
    });
    return { level, orgUnits, parents };
}

export function isOrgUnitMapped(
    mapping: Maybe<MetadataMappingDictionary["organisationUnits"]>,
    orgUnitId: Id
): boolean {
    const mappedId = mapping?.[orgUnitId]?.mappedId;
    return Boolean(mappedId) && mappedId !== "DISABLED";
}
