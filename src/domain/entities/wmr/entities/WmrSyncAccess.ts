import { Id } from "../../../common/entities/Schemas";
import { WmrNamedOrgUnit } from "./WmrOrgUnits";

export type WmrSyncAccessInfo = Readonly<{
    dataSet: Readonly<{ name: string; canWriteData: boolean }>;
    captureOrgUnitIds: ReadonlyArray<Id>;
}>;

export type WmrSyncAccess = Readonly<
    | { type: "ok" }
    | { type: "noDataWrite"; dataSet: string }
    | { type: "outsideCapture"; orgUnitNames: ReadonlyArray<string> }
>;

export function getWmrSyncAccess(
    info: WmrSyncAccessInfo,
    destinationOrgUnits: ReadonlyArray<WmrNamedOrgUnit>
): WmrSyncAccess {
    if (!info.dataSet.canWriteData) return { type: "noDataWrite", dataSet: info.dataSet.name };

    const captureOrgUnitIds = new Set(info.captureOrgUnitIds);
    const outsideOrgUnits = destinationOrgUnits.filter(
        ({ path }) => !path.split("/").some(id => captureOrgUnitIds.has(id))
    );

    return outsideOrgUnits.length > 0
        ? { type: "outsideCapture", orgUnitNames: outsideOrgUnits.map(({ name }) => name) }
        : { type: "ok" };
}
