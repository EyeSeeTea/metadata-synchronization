import { Id } from "../../../common/entities/Schemas";
import { RepositoryFactory } from "../../../common/factories/RepositoryFactory";
import { Instance } from "../../../instance/entities/Instance";
import { WmrDataSet } from "../entities/WmrDataSet";

export class GetDataSetByIdUseCase {
    constructor(private repositoryFactory: RepositoryFactory, private localInstance: Instance) {}

    execute(id: Id): Promise<WmrDataSet> {
        return this.repositoryFactory.wmrDataSetRepository(this.localInstance).getById(id);
    }
}
