import { Maybe } from "../../../../types/utils";
import { MetadataMappingDictionary } from "../../../mapping/entities/MetadataMapping";
import { WmrFlowKind, wmrFlowDefinitions } from "./WmrFlowKind";
import { findDuplicatedTargets, isOrgUnitMapped, WmrLevelOrgUnit } from "./WmrOrgUnits";

export type WmrSetupState = Readonly<{
    flowKind: Maybe<WmrFlowKind>;
    requisitesReady: boolean;
    hasTargetInstance: boolean;
    regionalParents: ReadonlyArray<WmrLevelOrgUnit>;
    orgUnitMapping: Maybe<MetadataMappingDictionary["organisationUnits"]>;
}>;

export type WmrSetupBlocker =
    | Readonly<{ type: "noFlow" }>
    | Readonly<{ type: "requisites" }>
    | Readonly<{ type: "targetInstance" }>
    | Readonly<{ type: "level" }>
    | Readonly<{ type: "unmapped"; count: number }>
    | Readonly<{ type: "duplicated"; orgUnitNames: ReadonlyArray<string> }>;

export function getWmrSetupBlocker(state: WmrSetupState): Maybe<WmrSetupBlocker> {
    const { flowKind, requisitesReady, hasTargetInstance, regionalParents, orgUnitMapping } = state;
    if (!flowKind) return { type: "noFlow" };
    if (!requisitesReady) return { type: "requisites" };
    if (!hasTargetInstance) return { type: "targetInstance" };

    const definition = wmrFlowDefinitions[flowKind];
    if (definition.destinationOrgUnits === "parents" && regionalParents.length === 0) return { type: "level" };
    if (definition.targetOrgUnit === "override") return undefined;

    const unmappedCount = regionalParents.filter(({ id }) => !isOrgUnitMapped(orgUnitMapping, id)).length;
    if (unmappedCount > 0) return { type: "unmapped", count: unmappedCount };

    const [duplicated] = findDuplicatedTargets(
        orgUnitMapping,
        regionalParents.map(({ id }) => id)
    );
    if (!duplicated) return undefined;
    const namesById = new Map(regionalParents.map(({ id, name }) => [id, name]));
    return { type: "duplicated", orgUnitNames: duplicated.orgUnitIds.map(id => namesById.get(id) ?? id) };
}
