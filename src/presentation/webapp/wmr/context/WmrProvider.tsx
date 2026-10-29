import { useSnackbar } from "@eyeseetea/d2-ui-components";
import React from "react";
import { Id } from "../../../../domain/common/entities/Schemas";
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
    const [targetDataSetId, setTargetDataSetId] = React.useState<Maybe<Id>>();
    const [orgUnitMapping, setOrgUnitMapping] = React.useState<Maybe<WmrOrgUnitMapping>>();
    const [regionalOutputOrgUnits, setRegionalOutputOrgUnits] = React.useState<ReadonlyArray<WmrLevelOrgUnit>>([]);
    const [regionalPrepared, setRegionalPrepared] = React.useState(false);
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
            setTargetDataSetId(undefined);
            setOrgUnitMapping(undefined);
            setRegionalOutputOrgUnits([]);
            setRegionalPrepared(false);
            setFlowKindState(kind);
        },
        [flowKind]
    );

    const setTargetInstanceWithInvalidation = React.useCallback((instance: Maybe<Instance>) => {
        setTargetInstance(instance);
        setTargetDataSetId(undefined);
        setRegionalPrepared(false);
    }, []);
    const setOrgUnitMappingWithInvalidation = React.useCallback((mapping: Maybe<WmrOrgUnitMapping>) => {
        setOrgUnitMapping(mapping);
        setRegionalPrepared(false);
    }, []);
    const setRegionalOutputOrgUnitsWithInvalidation = React.useCallback((orgUnits: ReadonlyArray<WmrLevelOrgUnit>) => {
        setRegionalOutputOrgUnits(orgUnits);
        setRegionalPrepared(false);
    }, []);
    const setRegionalMonthRangeWithInvalidation = React.useCallback((range: WmrMonthRange) => {
        setRegionalMonthRange(range);
        setRegionalPrepared(false);
    }, []);

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
                setTargetInstance: setTargetInstanceWithInvalidation,
                targetDataSetId,
                setTargetDataSetId,
                orgUnitMapping,
                setOrgUnitMapping: setOrgUnitMappingWithInvalidation,
                regionalOutputOrgUnits,
                setRegionalOutputOrgUnits: setRegionalOutputOrgUnitsWithInvalidation,
                regionalMonthRange,
                setRegionalMonthRange: setRegionalMonthRangeWithInvalidation,
                regionalPrepared,
                setRegionalPrepared,
            }}
        >
            {children}
        </WmrContext.Provider>
    );
}
