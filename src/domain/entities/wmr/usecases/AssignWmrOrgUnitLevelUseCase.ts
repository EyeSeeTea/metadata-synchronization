import { FutureData } from "../../../common/entities/Future";
import { DynamicRepositoryFactory } from "../../../common/factories/DynamicRepositoryFactory";
import { Instance } from "../../../instance/entities/Instance";

export class AssignWmrOrgUnitLevelUseCase {
    constructor(private repositoryFactory: DynamicRepositoryFactory, private localInstance: Instance) {}

    execute(level: number): FutureData<void> {
        return this.repositoryFactory.wmrOrgUnitsRepository(this.localInstance).assignLevel(level);
    }
}
