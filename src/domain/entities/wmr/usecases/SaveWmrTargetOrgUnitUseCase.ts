import { FutureData } from "../../../common/entities/Future";
import { Id } from "../../../common/entities/Schemas";
import { DynamicRepositoryFactory } from "../../../common/factories/DynamicRepositoryFactory";
import { Instance } from "../../../instance/entities/Instance";
import { withTargetOrgUnit } from "../entities/WmrUserSettings";

export class SaveWmrTargetOrgUnitUseCase {
    constructor(private repositoryFactory: DynamicRepositoryFactory, private localInstance: Instance) {}

    execute(instanceId: Id, orgUnitId: Id): FutureData<void> {
        const repository = this.repositoryFactory.wmrUserSettingsRepository(this.localInstance);
        return repository
            .get()
            .flatMap(settings => repository.save(withTargetOrgUnit(settings, instanceId, orgUnitId)));
    }
}
