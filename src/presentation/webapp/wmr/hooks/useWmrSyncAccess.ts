import React from "react";
import { WmrNamedOrgUnit } from "../../../../domain/entities/wmr/entities/WmrOrgUnits";
import { WmrSyncAccess } from "../../../../domain/entities/wmr/entities/WmrSyncAccess";
import i18n from "../../../../utils/i18n";
import { useAppContext } from "../../../react/core/contexts/AppContext";

export type WmrSyncAccessState = Readonly<{ type: "checking" } | { type: "ok" } | { type: "error"; message: string }>;

export function useWmrSyncAccess(destinationOrgUnits: ReadonlyArray<WmrNamedOrgUnit>): WmrSyncAccessState {
    const { compositionRoot } = useAppContext();
    const [state, setState] = React.useState<WmrSyncAccessState>({ type: "checking" });

    React.useEffect(() => {
        setState({ type: "checking" });
        return compositionRoot.wmr.checkSyncAccess(destinationOrgUnits).run(
            access => setState(toWmrSyncAccessState(access)),
            error => setState({ type: "error", message: error.message })
        );
    }, [compositionRoot, destinationOrgUnits]);

    return state;
}

export function toWmrSyncAccessState(access: WmrSyncAccess): WmrSyncAccessState {
    const options = { nsSeparator: false, interpolation: { escapeValue: false } } as const;
    switch (access.type) {
        case "ok":
            return { type: "ok" };
        case "noDataWrite":
            return {
                type: "error",
                message: i18n.t("You cannot enter data in {{dataSet}}. Ask an administrator for data write sharing.", {
                    dataSet: access.dataSet,
                    ...options,
                }),
            };
        case "outsideCapture":
            return {
                type: "error",
                message: i18n.t("{{orgUnits}} are outside your data capture organisation units.", {
                    orgUnits: access.orgUnitNames.join(", "),
                    ...options,
                }),
            };
    }
}
