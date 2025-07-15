import { FutureData } from "../../../common/entities/Future";
import { RepositoryFactory } from "../../../common/factories/RepositoryFactory";
import { Instance } from "../../../instance/entities/Instance";
import { WmrRequisiteType } from "../entities/WmrRequisite";

export class CheckWmrRequisitesByTypeUseCase {
    constructor(private repositoryFactory: RepositoryFactory, private localInstance: Instance) {}

    execute(requisiteType: WmrRequisiteType): FutureData<boolean> {
        return this.repositoryFactory.wmrRequisitesRepository(this.localInstance).checkWmrRequisites(requisiteType);
    }
}
