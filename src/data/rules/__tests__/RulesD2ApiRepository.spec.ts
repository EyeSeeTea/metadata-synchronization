import { instance, mock, verify, when } from "ts-mockito";
import { Instance } from "../../../domain/instance/entities/Instance";
import { SynchronizationRule } from "../../../domain/rules/entities/SynchronizationRule";
import { StorageClient } from "../../../domain/storage/repositories/StorageClient";
import { UserRepository } from "../../../domain/user/repositories/UserRepository";
import { StorageClientFactory } from "../../config/StorageClientFactory";
import { Namespace } from "../../storage/Namespaces";
import { RulesD2ApiRepository } from "../RulesD2ApiRepository";

describe("RulesD2ApiRepository", () => {
    it("should propagate the error when listing rules fails", async () => {
        const error = new Error("DHIS2 unavailable");
        const repository = givenARulesRepositoryWithFailedCollectionRead(error);

        await expect(repository.list()).rejects.toBe(error);
    });

    it("should reject the whole batch before accessing storage when a rule has no builder", async () => {
        const completeRule = SynchronizationRule.create().update({ id: "complete-rule" });
        const partialRule = completeRule.update({ id: "partial-rule", builder: undefined });
        const { repository, storageClientFactory } = givenARulesRepositoryWithUnavailableStorage();

        await expect(repository.save([completeRule, partialRule])).rejects.toThrow(
            "Cannot save rule partial-rule without a builder"
        );
        verify(storageClientFactory.getStorageClientPromise()).never();
    });

    function givenARulesRepositoryWithUnavailableStorage() {
        const storageClientFactory = mock<StorageClientFactory>();
        when(storageClientFactory.getStorageClientPromise()).thenReject(new Error("Storage was accessed"));

        return { repository: givenARulesRepository(storageClientFactory), storageClientFactory };
    }

    function givenARulesRepository(storageClientFactory: StorageClientFactory): RulesD2ApiRepository {
        const localInstance = Instance.build({
            id: "local",
            name: "Local",
            type: "local",
            url: "http://localhost:8080",
        });
        return new RulesD2ApiRepository(
            localInstance,
            instance(storageClientFactory),
            instance(mock<UserRepository>())
        );
    }

    function givenARulesRepositoryWithFailedCollectionRead(error: Error): RulesD2ApiRepository {
        const storageClient = mock<StorageClient>();
        when(storageClient.listObjectsInCollection(Namespace.RULES)).thenReject(error);

        const storage = instance(storageClient);
        // Promise resolution checks for "then", which the mock proxy would otherwise supply.
        Object.defineProperty(storage, "then", { value: undefined });
        const storageClientFactory = mock<StorageClientFactory>();
        when(storageClientFactory.getStorageClientPromise()).thenResolve(storage);

        return givenARulesRepository(storageClientFactory);
    }
});
