import { UseCase } from "../../common/entities/UseCase";
import { Instance } from "../entities/Instance";
import { InstanceRepository, InstancesFilter } from "../repositories/InstanceRepository";

export class ListInstancesUseCase implements UseCase {
    constructor(private instanceRepository: InstanceRepository) {}

    public async execute(filters: InstancesFilter = {}): Promise<Instance[]> {
        return this.instanceRepository.getAll(filters);
    }
}
