import { Maybe } from "../../../../types/utils";
import { WmrFlowKind, wmrFlowDefinitions } from "./WmrFlowKind";
import { WmrLevelOrgUnit } from "./WmrOrgUnits";

export type WmrSetupState = Readonly<{
    flowKind: Maybe<WmrFlowKind>;
    requisitesReady: boolean;
    hasTargetInstance: boolean;
    regionalOutputOrgUnits: ReadonlyArray<WmrLevelOrgUnit>;
}>;

export type WmrSetupBlocker =
    | Readonly<{ type: "noFlow" }>
    | Readonly<{ type: "requisites" }>
    | Readonly<{ type: "targetInstance" }>
    | Readonly<{ type: "level" }>;

export function getWmrSetupBlocker(state: WmrSetupState): Maybe<WmrSetupBlocker> {
    const { flowKind, requisitesReady, hasTargetInstance, regionalOutputOrgUnits } = state;
    if (!flowKind) return { type: "noFlow" };
    if (!requisitesReady) return { type: "requisites" };
    if (!hasTargetInstance) return { type: "targetInstance" };

    const definition = wmrFlowDefinitions[flowKind];
    return definition.destinationOrgUnits === "selected" && regionalOutputOrgUnits.length === 0
        ? { type: "level" }
        : undefined;
}
