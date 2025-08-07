import { UseCase } from "../../common/entities/UseCase";
import { DynamicRepositoryFactory } from "../../common/factories/DynamicRepositoryFactory";
import { Instance } from "../entities/Instance";

export class DeleteInstanceUseCase implements UseCase {
    constructor(private repositoryFactory: DynamicRepositoryFactory, private localInstance: Instance) {}

    public async execute(id: string): Promise<Boolean> {
        const instanceRepository = this.repositoryFactory.instanceRepository(this.localInstance);

        try {
            await instanceRepository.delete(id);
        } catch (error: any) {
            console.error(error);
            return false;
        }

        return true;
    }
}
