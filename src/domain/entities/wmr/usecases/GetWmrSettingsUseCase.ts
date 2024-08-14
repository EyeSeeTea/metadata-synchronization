import { RepositoryFactory } from "../../../common/factories/RepositoryFactory";
import { Instance } from "../../../instance/entities/Instance";
import { WmrSettings } from "../entities/WmrSettings";

export class GetWmrSettingsUseCase {
    constructor(private repositoryFactory: RepositoryFactory, private localInstance: Instance) {}

    execute(): Promise<WmrSettings> {
        return this.repositoryFactory.wmrSettingsRepository(this.localInstance).get();
    }
}
