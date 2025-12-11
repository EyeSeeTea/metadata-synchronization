import { UseCase } from "../../common/entities/UseCase";
import { DynamicRepositoryFactory } from "../../common/factories/DynamicRepositoryFactory";
import { Instance } from "../entities/Instance";
import { InstancesFilter } from "../repositories/InstanceRepository";

export class ListInstancesUseCase implements UseCase {
    constructor(private repositoryFactory: DynamicRepositoryFactory, private localInstance: Instance) {}

    public async execute(filters: InstancesFilter = {}): Promise<Instance[]> {
        const user = await this.repositoryFactory.userRepository(this.localInstance).getCurrent();
        const instances = await this.repositoryFactory.instanceRepository(this.localInstance).getAll(filters);

        return instances.filter(instance => instance.hasPermissions("read", user) || instance.id === "LOCAL");
    }
}
