import { FutureData } from "../../../common/entities/Future";
import { RepositoryFactory } from "../../../common/factories/RepositoryFactory";
import { Instance } from "../../../instance/entities/Instance";
import { WmrRequisiteType } from "../entities/WmrRequisite";

export class SetupWmrRequisitesByTypeUseCase {
    constructor(private repositoryFactory: RepositoryFactory, private localInstance: Instance) {}

    execute(requisiteType: WmrRequisiteType): FutureData<void> {
        return this.repositoryFactory.wmrRequisitesRepository(this.localInstance).setupRequisite(requisiteType);
    }
}
