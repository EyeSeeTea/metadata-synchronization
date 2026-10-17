import { FutureData } from "../../../common/entities/Future";
import { WmrLevelOrgUnit, WmrOrgUnitLevel } from "../entities/WmrOrgUnits";

export interface WmrOrgUnitsRepository {
    getLevels(): FutureData<ReadonlyArray<WmrOrgUnitLevel>>;
    getLevelOrgUnits(level: number): FutureData<ReadonlyArray<WmrLevelOrgUnit>>;
    getAssigned(dataSetCode: string): FutureData<ReadonlyArray<WmrLevelOrgUnit>>;
    assignLevel(level: number): FutureData<void>;
}
