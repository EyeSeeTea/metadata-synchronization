import { instance, mock, when } from "ts-mockito";
import { Instance } from "../../../domain/instance/entities/Instance";
import { StorageClient } from "../../../domain/storage/repositories/StorageClient";
import { UserRepository } from "../../../domain/user/repositories/UserRepository";
import { StorageClientFactory } from "../../config/StorageClientFactory";
import { Namespace } from "../../storage/Namespaces";
import { RulesD2ApiRepository } from "../RulesD2ApiRepository";

describe("RulesD2ApiRepository", () => {
    it("propagates the error when listing rules fails", async () => {
        const error = new Error("DHIS2 unavailable");
        const repository = givenARulesRepositoryWithFailedCollectionRead(error);

        await expect(repository.list()).rejects.toBe(error);
    });

    function givenARulesRepositoryWithFailedCollectionRead(error: Error): RulesD2ApiRepository {
        const localInstance = Instance.build({
            id: "local",
            name: "Local",
            type: "local",
            url: "http://localhost:8080",
        });
        const storageClient = mock<StorageClient>();
        when(storageClient.listObjectsInCollection(Namespace.RULES)).thenReject(error);

        const storage = instance(storageClient);
        // Promise resolution checks for "then", which the mock proxy would otherwise supply.
        Object.defineProperty(storage, "then", { value: undefined });
        const storageClientFactory = mock<StorageClientFactory>();
        when(storageClientFactory.getStorageClientPromise()).thenResolve(storage);

        return new RulesD2ApiRepository(
            localInstance,
            instance(storageClientFactory),
            instance(mock<UserRepository>())
        );
    }
});
