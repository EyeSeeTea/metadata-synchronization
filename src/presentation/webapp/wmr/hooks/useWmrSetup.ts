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

    const importMetadata = React.useCallback((type: WmrRequisiteType) => {
        updateSetupItem(type, { status: "uploading" });
        // TODO: implement import
    }, []);

    const verifyMetadata = React.useCallback(() => {
        setSetupStatuses({
            metadata: { status: "loading" },
            dataStore: { status: "loading" },
        });
        compositionRoot.wmr.checkRequisites("metadata").run(
            result => {
                updateSetupItem("metadata", {
                    status: result ? "done" : "pending",
                });
            },
            () => {
                updateSetupItem("metadata", { status: "error" });
            }
        );
        compositionRoot.wmr.checkRequisites("dataStore").run(
            result => {
                updateSetupItem("dataStore", {
                    status: result ? "done" : "pending",
                });
            },
            () => {
                updateSetupItem("dataStore", { status: "error" });
            }
        );
    }, [compositionRoot]);

    const updateSetupItem = (type: WmrRequisiteType, status: WmrSetupStatus) => {
        setSetupStatuses(prevStatuses => ({
            ...prevStatuses,
            [type]: status,
        }));
    };

    return {
        setupStatuses,
        importMetadata,
        verifyMetadata,
    };
}
