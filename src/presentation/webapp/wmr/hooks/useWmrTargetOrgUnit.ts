import React from "react";
import { Id } from "../../../../domain/common/entities/Schemas";
import { Instance } from "../../../../domain/instance/entities/Instance";
import { Maybe } from "../../../../types/utils";
import { useAppContext } from "../../../react/core/contexts/AppContext";

type SavedTargetOrgUnit = Readonly<{ type: "loading" } | { type: "loaded"; orgUnitId: Maybe<Id> }>;

type LoadedTargetOrgUnit = Readonly<{ instanceId: Id; orgUnitId: Maybe<Id> }>;

export function useWmrTargetOrgUnit(instance: Maybe<Instance>) {
    const { compositionRoot } = useAppContext();
    const [loaded, setLoaded] = React.useState<Maybe<LoadedTargetOrgUnit>>();
    const instanceId = instance?.id;

    React.useEffect(() => {
        if (!instanceId) return;
        return compositionRoot.wmr.getTargetOrgUnit(instanceId).run(
            orgUnitId => setLoaded({ instanceId, orgUnitId }),
            error => {
                console.error(error);
                setLoaded({ instanceId, orgUnitId: undefined });
            }
        );
    }, [compositionRoot.wmr, instanceId]);

    const saveTargetOrgUnit = React.useCallback(
        (orgUnitId: Id) => {
            if (!instanceId) return;
            compositionRoot.wmr.saveTargetOrgUnit(instanceId, orgUnitId).run(
                () => {},
                error => console.error(error)
            );
        },
        [compositionRoot.wmr, instanceId]
    );

    const savedTargetOrgUnit: SavedTargetOrgUnit =
        loaded && loaded.instanceId === instanceId
            ? { type: "loaded", orgUnitId: loaded.orgUnitId }
            : { type: "loading" };

    return { savedTargetOrgUnit, saveTargetOrgUnit };
}
