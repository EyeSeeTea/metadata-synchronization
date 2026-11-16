import { FutureData } from "../../../common/entities/Future";
import { DynamicRepositoryFactory } from "../../../common/factories/DynamicRepositoryFactory";
import { Instance } from "../../../instance/entities/Instance";
import { getAssignableLevels, WmrOrgUnitLevel } from "../entities/WmrOrgUnits";

export class GetWmrOrgUnitLevelsUseCase {
    constructor(private repositoryFactory: DynamicRepositoryFactory, private localInstance: Instance) {}

    execute(): FutureData<ReadonlyArray<WmrOrgUnitLevel>> {
        return this.repositoryFactory.wmrOrgUnitsRepository(this.localInstance).getLevels().map(getAssignableLevels);
    }
}
