import { instance, mock, verify, when } from "ts-mockito";
import { Instance } from "../../../domain/instance/entities/Instance";
import { SynchronizationRule } from "../../../domain/rules/entities/SynchronizationRule";
import { StorageClient } from "../../../domain/storage/repositories/StorageClient";
import { UserRepository } from "../../../domain/user/repositories/UserRepository";
import { startDhis } from "../../../utils/dhisServer";
import { StorageClientFactory } from "../../config/StorageClientFactory";
import { Namespace } from "../../storage/Namespaces";
import { StorageDataStoreClient } from "../../storage/StorageDataStoreClient";
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

    it("should save a rule and reconcile its ADEX configuration without reading rule details", async () => {
        const rule = SynchronizationRule.create().update({ id: "rule-to-save" });
        const { repository, server, readPaths, deletedPaths, savedDetail } =
            givenARulesRepositoryWithPreviousAdexConfiguration(rule);

        try {
            await repository.save([rule]);

            expect(deletedPaths).toEqual([
                "/api/aggregateDataExchanges/previous-adex",
                "/api/jobConfigurations/previous-job",
            ]);
            expect(savedDetail()).toEqual({ builder: rule.builder });
            expect(readPaths).toEqual([rulesPath, rulesPath]);
        } finally {
            server.shutdown();
        }
    });

    const rulesPath = "/dataStore/metadata-synchronization/rules";

    function givenARulesRepositoryWithPreviousAdexConfiguration(rule: SynchronizationRule) {
        const localInstance = Instance.build({ name: "Local", type: "local", url: "http://rules.test" });
        const server = startDhis({ urlPrefix: localInstance.url });
        const readPaths: string[] = [];
        const deletedPaths: string[] = [];
        let detail: unknown;
        const previousRules = [
            {
                id: rule.id,
                aggregatedDataExchanges: [{ id: "previous-adex" }],
                aggregatedDataExchangeDhis2Job: { id: "previous-job" },
            },
            {
                id: "other-rule",
                aggregatedDataExchanges: [{ id: "other-adex" }],
                aggregatedDataExchangeDhis2Job: { id: "other-job" },
            },
        ];

        server.get(rulesPath, () => {
            readPaths.push(rulesPath);
            return previousRules;
        });
        for (const previousRule of previousRules) {
            const detailPath = rulesPath + "-" + previousRule.id;
            server.get(detailPath, () => {
                readPaths.push(detailPath);
                return { builder: rule.builder };
            });
        }
        server.get("/dataStore/metadata-synchronization/instances", () => []);
        server.del("/aggregateDataExchanges/:id", (_schema, request) => {
            deletedPaths.push("/api/aggregateDataExchanges/" + request.params.id);
            return { status: "OK" };
        });
        server.del("/jobConfigurations/:id", (_schema, request) => {
            deletedPaths.push("/api/jobConfigurations/" + request.params.id);
            return { status: "OK" };
        });
        server.put(rulesPath, () => ({ status: "OK" }));
        server.put(rulesPath + "-" + rule.id, (_schema, request) => {
            detail = JSON.parse(request.requestBody);
            return { status: "OK" };
        });

        const storageClientFactory = mock<StorageClientFactory>();
        when(storageClientFactory.getStorageClientPromise()).thenResolve(new StorageDataStoreClient(localInstance));

        const repository = givenARulesRepository(storageClientFactory, localInstance);
        return { repository, server, readPaths, deletedPaths, savedDetail: () => detail };
    }

    function givenARulesRepositoryWithUnavailableStorage() {
        const storageClientFactory = mock<StorageClientFactory>();
        when(storageClientFactory.getStorageClientPromise()).thenReject(new Error("Storage was accessed"));

        return { repository: givenARulesRepository(storageClientFactory), storageClientFactory };
    }

    function givenARulesRepository(
        storageClientFactory: StorageClientFactory,
        localInstance = Instance.build({ id: "local", name: "Local", type: "local", url: "http://localhost:8080" })
    ): RulesD2ApiRepository {
        const userRepository = mock<UserRepository>();
        when(userRepository.getCurrent()).thenResolve({
            id: "user",
            name: "User",
            email: "",
            username: "user",
            userGroups: [],
            organisationUnits: [],
            dataViewOrganisationUnits: [],
            isGlobalAdmin: true,
            isAppConfigurator: true,
            isAppExecutor: true,
        });

        return new RulesD2ApiRepository(localInstance, instance(storageClientFactory), instance(userRepository));
    }

    function givenARulesRepositoryWithFailedCollectionRead(error: Error): RulesD2ApiRepository {
        const storageClient = mock<StorageClient>();
        when(storageClient.listObjectsInCollection(Namespace.RULES)).thenReject(error);

        return givenARulesRepository(givenAStorageClientFactory(storageClient));
    }

    function givenAStorageClientFactory(storageClient: StorageClient): StorageClientFactory {
        const storage = instance(storageClient);
        // Promise resolution checks for "then", which the mock proxy would otherwise supply.
        Object.defineProperty(storage, "then", { value: undefined });
        const storageClientFactory = mock<StorageClientFactory>();
        when(storageClientFactory.getStorageClientPromise()).thenResolve(storage);

        return storageClientFactory;
    }
});
