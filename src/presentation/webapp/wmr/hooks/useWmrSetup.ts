import React from "react";
import { WmrRequisiteType } from "../../../../domain/entities/wmr/entities/WmrRequisite";
import { useAppContext } from "../../../react/core/contexts/AppContext";

export type WmrSetupStatusType = "loading" | "pending" | "done" | "error" | "uploading";

export type WmrSetupStatus = {
    status: WmrSetupStatusType;
};

export type WmrSetupStatuses = {
    [type in WmrRequisiteType]: WmrSetupStatus;
};

export function useWmrSetup() {
    const { compositionRoot } = useAppContext();

    const [setupStatuses, setSetupStatuses] = React.useState<WmrSetupStatuses>({
        metadata: { status: "loading" },
        dataStore: { status: "loading" },
    });

    const verifyRequisite = React.useCallback(
        (type: WmrRequisiteType) => {
            updateSetupItem(type, { status: "loading" });
            compositionRoot.wmr.checkRequisites(type).run(
                result => {
                    updateSetupItem(type, {
                        status: result ? "done" : "pending",
                    });
                },
                () => {
                    updateSetupItem(type, { status: "error" });
                }
            );
        },
        [compositionRoot]
    );

    const setupRequisite = React.useCallback(
        (type: WmrRequisiteType) => {
            updateSetupItem(type, { status: "uploading" });
            compositionRoot.wmr.setupRequisites(type).run(
                () => {
                    verifyRequisite(type);
                },
                () => {
                    updateSetupItem(type, { status: "error" });
                }
            );
        },
        [compositionRoot, verifyRequisite]
    );

    const updateSetupItem = (type: WmrRequisiteType, status: WmrSetupStatus) => {
        setSetupStatuses(prevStatuses => ({
            ...prevStatuses,
            [type]: status,
        }));
    };

    return {
        setupStatuses,
        setupRequisite,
        verifyRequisite,
    };
}
