import { FutureData } from "../../../common/entities/Future";
import { DynamicRepositoryFactory } from "../../../common/factories/DynamicRepositoryFactory";
import { Instance } from "../../../instance/entities/Instance";
import { WmrRequisiteCheck, WmrRequisiteType } from "../entities/WmrRequisite";

export class CheckWmrRequisitesByTypeUseCase {
    constructor(private repositoryFactory: DynamicRepositoryFactory, private localInstance: Instance) {}

    execute(requisiteType: WmrRequisiteType): FutureData<WmrRequisiteCheck> {
        return this.repositoryFactory.wmrRequisitesRepository(this.localInstance).checkWmrRequisites(requisiteType);
    }
}
