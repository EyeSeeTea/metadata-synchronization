import { Either } from "../../common/entities/Either";
import { UseCase } from "../../common/entities/UseCase";
import { RepositoryFactory } from "../../common/factories/RepositoryFactory";
import { Instance } from "../../instance/entities/Instance";
import { InstanceRepositoryConstructor } from "../../instance/repositories/InstanceRepository";
import { Repositories } from "../../Repositories";
import { Namespace } from "../../storage/Namespaces";
import { StorageRepositoryConstructor } from "../../storage/repositories/StorageRepository";
import { PullRequestStatus } from "../../synchronization/entities/PullRequest";
import { PullRequestNotification } from "../entities/PullRequestNotification";

type UpdateError = "NOT_FOUND" | "PERMISSIONS";

export class UpdatePullRequestStatusUseCase implements UseCase {
    constructor(private repositoryFactory: RepositoryFactory, private localInstance: Instance) {}

    public async execute(
        id: string,
        status: PullRequestStatus
    ): Promise<Either<UpdateError, void>> {
        const storageRepository = this.repositoryFactory.get<StorageRepositoryConstructor>(
            Repositories.StorageRepository,
            [this.localInstance]
        );

        const notification = await storageRepository.getObjectInCollection<PullRequestNotification>(
            Namespace.NOTIFICATIONS,
            id
        );
        if (!notification) return Either.error("NOT_FOUND");

        const hasPermissions = await this.hasPermissions(notification);
        if (!hasPermissions) return Either.error("PERMISSIONS");

        const newNotification: PullRequestNotification = {
            ...notification,
            read: true,
            request: { ...notification.request, status },
        };

        await storageRepository.saveObjectInCollection(Namespace.NOTIFICATIONS, newNotification);

        return Either.success(undefined);
    }

    private async hasPermissions(notification: PullRequestNotification) {
        const instanceRepository = this.repositoryFactory.get<InstanceRepositoryConstructor>(
            Repositories.InstanceRepository,
            [this.localInstance, ""]
        );

        const { id, userGroups } = await instanceRepository.getUser();

        if (
            !notification.users?.find(user => user.id === id) &&
            !notification.userGroups?.find(({ id }) => userGroups.includes(id))
        ) {
            return false;
        }

        return true;
    }
}