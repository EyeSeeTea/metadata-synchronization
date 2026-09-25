import { FutureData } from "../../../common/entities/Future";
import { Id } from "../../../common/entities/Schemas";
import { DynamicRepositoryFactory } from "../../../common/factories/DynamicRepositoryFactory";
import { Instance } from "../../../instance/entities/Instance";
import { Maybe } from "../../../../types/utils";

export class GetWmrTargetOrgUnitUseCase {
    constructor(private repositoryFactory: DynamicRepositoryFactory, private localInstance: Instance) {}

    execute(instanceId: Id): FutureData<Maybe<Id>> {
        return this.repositoryFactory
            .wmrUserSettingsRepository(this.localInstance)
            .get()
            .map(settings => settings.targetOrgUnitByInstance[instanceId]);
    }
}
