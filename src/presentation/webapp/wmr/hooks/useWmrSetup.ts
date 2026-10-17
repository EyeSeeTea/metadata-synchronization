import React from "react";
import { wmrFlowDefinitions } from "../../../../domain/entities/wmr/entities/WmrFlowKind";
import { WmrRequisiteCheck, WmrRequisiteType } from "../../../../domain/entities/wmr/entities/WmrRequisite";
import { useAppContext } from "../../../react/core/contexts/AppContext";
import { useWmrContext } from "../context/WmrContext";

export type WmrSetupStatus =
    | Readonly<{ status: "loading" | "pending" | "done" | "error" | "uploading" }>
    | Readonly<{ status: "misassigned"; dataSetName: string }>;

export type WmrSetupStatusType = WmrSetupStatus["status"];

export type WmrSetupStatuses = Readonly<Record<WmrRequisiteType, WmrSetupStatus>>;

const initialStatuses: WmrSetupStatuses = {
    metadata: { status: "loading" },
    dataStore: { status: "loading" },
    countryFormMonthly: { status: "loading" },
};

export function toWmrSetupStatus(check: WmrRequisiteCheck): WmrSetupStatus {
    switch (check.type) {
        case "installed":
            return { status: "done" };
        case "missing":
            return { status: "pending" };
        case "misassigned":
            return { status: "misassigned", dataSetName: check.dataSetName };
    }
}

export function isWmrSetupReady(statuses: WmrSetupStatuses): boolean {
    return wmrFlowDefinitions.global.requisites.every(type => statuses[type].status === "done");
}

export function useWmrSetup() {
    const { compositionRoot } = useAppContext();
    const { setRequisitesReady } = useWmrContext();
    const [setupStatuses, setSetupStatuses] = React.useState<WmrSetupStatuses>(initialStatuses);

    const updateSetupItem = React.useCallback((type: WmrRequisiteType, status: WmrSetupStatus) => {
        setSetupStatuses(prevStatuses => ({ ...prevStatuses, [type]: status }));
    }, []);

    const verifyRequisite = React.useCallback(
        (type: WmrRequisiteType) => {
            updateSetupItem(type, { status: "loading" });
            compositionRoot.wmr.checkRequisites(type).run(
                check => updateSetupItem(type, toWmrSetupStatus(check)),
                () => updateSetupItem(type, { status: "error" })
            );
        },
        [compositionRoot, updateSetupItem]
    );

    const setupRequisite = React.useCallback(
        (type: WmrRequisiteType) => {
            updateSetupItem(type, { status: "uploading" });
            compositionRoot.wmr.setupRequisites(type).run(
                () => verifyRequisite(type),
                () => updateSetupItem(type, { status: "error" })
            );
        },
        [compositionRoot, updateSetupItem, verifyRequisite]
    );

    React.useEffect(() => {
        setRequisitesReady(isWmrSetupReady(setupStatuses));
    }, [setupStatuses, setRequisitesReady]);

    return {
        setupStatuses,
        setupRequisite,
        verifyRequisite,
    };
}
