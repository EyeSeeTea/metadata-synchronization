import { useSnackbar } from "@eyeseetea/d2-ui-components";
import React from "react";
import { WmrFlowKind } from "../../../../domain/entities/wmr/entities/WmrFlowKind";
import { WmrLevelOrgUnit } from "../../../../domain/entities/wmr/entities/WmrOrgUnits";
import { WmrSettings } from "../../../../domain/entities/wmr/entities/WmrSettings";
import {
    getWmrFullYearRange,
    getWmrReportedYear,
    WmrMonthRange,
} from "../../../../domain/entities/wmr/entities/WmrSyncFlow";
import { Instance } from "../../../../domain/instance/entities/Instance";
import { SynchronizationRule } from "../../../../domain/rules/entities/SynchronizationRule";
import { Maybe } from "../../../../types/utils";
import { useAppContext } from "../../../react/core/contexts/AppContext";
import { WmrContext, WmrOrgUnitMapping, WmrSyncRule } from "./WmrContext";

function createWmrSyncRule(): SynchronizationRule {
    return SynchronizationRule.createOnDemand("aggregated")
        .updateBuilder({ metadataIds: [] })
        .updateMetadataTypes(["dataElements", "indicators"])
        .updateDataSyncOrgUnitPaths([])
        .updateDataSyncPeriod("LAST_YEAR")
        .updateTargetInstances([WmrSettings.LOCAL_INSTANCE_ID]);
}

function getFullReportedYearRange(rule: SynchronizationRule): WmrMonthRange {
    return getWmrFullYearRange(getWmrReportedYear(rule.dataParams));
}

export function WmrProvider({ children }: { children: React.ReactNode }) {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const [settings, setSettings] = React.useState<Maybe<WmrSettings>>();
    const [requisitesReady, setRequisitesReady] = React.useState<boolean>(false);
    const [flowKind, setFlowKindState] = React.useState<Maybe<WmrFlowKind>>();
    const [targetInstance, setTargetInstance] = React.useState<Maybe<Instance>>();
    const [orgUnitMapping, setOrgUnitMapping] = React.useState<Maybe<WmrOrgUnitMapping>>();
    const [regionalParents, setRegionalParents] = React.useState<ReadonlyArray<WmrLevelOrgUnit>>([]);
    const syncRuleRef = React.useRef<WmrSyncRule>({
        localDataSetId: undefined,
        flow: undefined,
        rule: createWmrSyncRule(),
    });
    const [regionalMonthRange, setRegionalMonthRange] = React.useState<WmrMonthRange>(() =>
        getFullReportedYearRange(syncRuleRef.current.rule)
    );

    const loadSettings = React.useCallback(() => {
        compositionRoot.wmr
            .settings()
            .then(setSettings)
            .catch(err => {
                snackbar.error(err.message);
            });
    }, [compositionRoot, setSettings, snackbar]);

    const setFlowKind = React.useCallback(
        (kind: WmrFlowKind) => {
            if (kind === flowKind) return;
            syncRuleRef.current.flow = undefined;
            syncRuleRef.current.localDataSetId = undefined;
            syncRuleRef.current.rule = createWmrSyncRule();
            setRegionalMonthRange(getFullReportedYearRange(syncRuleRef.current.rule));
            setTargetInstance(undefined);
            setOrgUnitMapping(undefined);
            setFlowKindState(kind);
        },
        [flowKind]
    );

    return (
        <WmrContext.Provider
            value={{
                loadSettings,
                settings,
                syncRule: syncRuleRef.current,
                requisitesReady,
                setRequisitesReady,
                flowKind,
                setFlowKind,
                targetInstance,
                setTargetInstance,
                orgUnitMapping,
                setOrgUnitMapping,
                regionalParents,
                setRegionalParents,
                regionalMonthRange,
                setRegionalMonthRange,
            }}
        >
            {children}
        </WmrContext.Provider>
    );
}
