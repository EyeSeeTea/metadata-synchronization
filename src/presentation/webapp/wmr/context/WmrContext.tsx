import React from "react";
import { Id } from "../../../../domain/common/entities/Schemas";
import { WmrFlowKind } from "../../../../domain/entities/wmr/entities/WmrFlowKind";
import { WmrLevelOrgUnit } from "../../../../domain/entities/wmr/entities/WmrOrgUnits";
import { WmrFlow, WmrSettings } from "../../../../domain/entities/wmr/entities/WmrSettings";
import { WmrMonthRange } from "../../../../domain/entities/wmr/entities/WmrSyncFlow";
import { Instance } from "../../../../domain/instance/entities/Instance";
import { MetadataMappingDictionary } from "../../../../domain/mapping/entities/MetadataMapping";
import { SynchronizationRule } from "../../../../domain/rules/entities/SynchronizationRule";
import { Maybe } from "../../../../types/utils";

export type WmrSyncRule = {
    localDataSetId: Maybe<Id>;
    flow: Maybe<WmrFlow>;
    rule: SynchronizationRule;
};

export type WmrOrgUnitMapping = MetadataMappingDictionary["organisationUnits"];

export interface WmrContextState {
    loadSettings: () => void;
    settings: Maybe<WmrSettings>;
    syncRule: Maybe<WmrSyncRule>;
    requisitesReady: boolean;
    setRequisitesReady: (ready: boolean) => void;
    flowKind: Maybe<WmrFlowKind>;
    setFlowKind: (flowKind: WmrFlowKind) => void;
    targetInstance: Maybe<Instance>;
    setTargetInstance: (instance: Maybe<Instance>) => void;
    targetDataSetId: Maybe<Id>;
    setTargetDataSetId: (dataSetId: Maybe<Id>) => void;
    orgUnitMapping: Maybe<WmrOrgUnitMapping>;
    setOrgUnitMapping: (mapping: Maybe<WmrOrgUnitMapping>) => void;
    regionalOutputOrgUnits: ReadonlyArray<WmrLevelOrgUnit>;
    setRegionalOutputOrgUnits: (orgUnits: ReadonlyArray<WmrLevelOrgUnit>) => void;
    regionalMonthRange: WmrMonthRange;
    setRegionalMonthRange: (range: WmrMonthRange) => void;
    regionalPrepared: boolean;
    setRegionalPrepared: (prepared: boolean) => void;
}

export const WmrContext = React.createContext<WmrContextState | null>(null);

export function useWmrContext() {
    const context = React.useContext(WmrContext);
    if (context) {
        return context;
    } else {
        throw new Error("WMR Context not found");
    }
}
