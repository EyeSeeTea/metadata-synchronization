import { Namespace } from "../../../data/storage/Namespaces";
import { UseCase } from "../../common/entities/UseCase";
import { RepositoryFactory } from "../../common/factories/RepositoryFactory";
import { Instance } from "../../instance/entities/Instance";
import { MetadataModule } from "../../modules/entities/MetadataModule";
import { BasePackage, Package } from "../entities/Package";

export class ListPackagesUseCase implements UseCase {
    constructor(private repositoryFactory: RepositoryFactory, private localInstance: Instance) {}

    public async execute(
        bypassSharingSettings = false,
        instance = this.localInstance
    ): Promise<Package[]> {
        const userGroups = await this.repositoryFactory
            .instanceRepository(this.localInstance)
            .getUserGroups();
        const { id: userId } = await this.repositoryFactory
            .instanceRepository(this.localInstance)
            .getUser();

        const items = await this.repositoryFactory
            .storageRepository(instance)
            .listObjectsInCollection<BasePackage>(Namespace.PACKAGES);

        return items
            .filter(({ deleted }) => !deleted)
            .map(data => Package.build(data))
            .filter(
                ({ module }) =>
                    bypassSharingSettings ||
                    MetadataModule.build(module).hasPermissions("read", userId, userGroups)
            );
    }
}
