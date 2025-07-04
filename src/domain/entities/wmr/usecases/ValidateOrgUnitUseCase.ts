import { FutureData } from "../../../common/entities/Future";
import { Id } from "../../../common/entities/Schemas";
import { RepositoryFactory } from "../../../common/factories/RepositoryFactory";
import { Instance } from "../../../instance/entities/Instance";

export class ValidateOrgUnitUseCase {
    constructor(private repositoryFactory: RepositoryFactory) {}

    execute(instance: Instance, orgUnitId: Id): FutureData<boolean> {
        return this.repositoryFactory.wmrRequisitesRepository(instance).validateOrgUnit(orgUnitId);
    }
}
