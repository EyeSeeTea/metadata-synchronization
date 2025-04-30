import { Namespace } from "../../../data/storage/Namespaces";
import { UseCase } from "../../common/entities/UseCase";
import { RepositoryByInstanceFactory } from "../../common/factories/RepositoryFactory";
import { Instance } from "../../instance/entities/Instance";
import { BasePackage } from "../entities/Package";

export class DeletePackageUseCase implements UseCase {
    constructor(private repositoryFactory: RepositoryByInstanceFactory, private localInstance: Instance) {}

    public async execute(id: string, instance = this.localInstance): Promise<boolean> {
        const storageClient = await this.repositoryFactory.configRepository(instance).getStorageClientPromise();

        try {
            const item = await storageClient.getObjectInCollection<BasePackage>(Namespace.PACKAGES, id);

            if (!item) return false;

            await storageClient.saveObjectInCollection(Namespace.PACKAGES, {
                ...item,
                deleted: true,
                contents: {},
            });
        } catch (error: any) {
            return false;
        }

        return true;
    }
}
