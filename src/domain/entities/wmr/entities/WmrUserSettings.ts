import { Id } from "../../../common/entities/Schemas";

export type WmrUserSettings = Readonly<{
    targetOrgUnitByInstance: Readonly<Record<Id, Id>>;
}>;

export const emptyWmrUserSettings: WmrUserSettings = { targetOrgUnitByInstance: {} };

export function withTargetOrgUnit(settings: WmrUserSettings, instanceId: Id, orgUnitId: Id): WmrUserSettings {
    return {
        ...settings,
        targetOrgUnitByInstance: { ...settings.targetOrgUnitByInstance, [instanceId]: orgUnitId },
    };
}
