import { anything, instance, mock, when } from "ts-mockito";
import { Namespace } from "../../../../data/storage/Namespaces";
import { DynamicRepositoryFactory } from "../../../common/factories/DynamicRepositoryFactory";
import { Instance } from "../../../instance/entities/Instance";
import { MetadataPayloadBuilder } from "../../../metadata/builders/MetadataPayloadBuilder";
import { MetadataPackage } from "../../../metadata/entities/MetadataEntities";
import { MetadataModule } from "../../../modules/entities/MetadataModule";
import { StorageClient } from "../../../storage/repositories/StorageClient";
import { StorageClientRepository } from "../../../storage-client-config/repositories/StorageClientRepository";
import { TransformationRepository } from "../../../transformations/repositories/TransformationRepository";
import { User } from "../../../user/entities/User";
import { UserRepository } from "../../../user/repositories/UserRepository";
import { CreatePackageUseCase } from "../CreatePackageUseCase";
import { Package } from "../../entities/Package";

const builtPayload: MetadataPackage = {
    dataSets: [{ id: "ds1", name: "DataSet 1" } as any],
};

const preSuppliedContents: MetadataPackage = {
    indicators: [{ id: "ind1", name: "Indicator 1" } as any],
};

describe("CreatePackageUseCase", () => {
    it("should persist the resolved payload from metadataPayloadBuilder.build() when contents is not provided", async () => {
        const { useCase, savedObjectsByNamespace } = givenACreatePackageUseCase();
        const module = givenAModule();
        const sourcePackage = givenAPackage(module);

        const validations = await useCase.execute("LOCAL", sourcePackage, module, "2.38.0");

        expect(validations).toEqual([]);

        const savedPackage = savedObjectsByNamespace[Namespace.PACKAGES] as Package;
        expect(savedPackage.contents).not.toBeInstanceOf(Promise);
        expect(savedPackage.contents).toEqual(builtPayload);
    });

    it("should persist the provided contents as-is, without building a new payload", async () => {
        const { useCase, savedObjectsByNamespace } = givenACreatePackageUseCase();
        const module = givenAModule();
        const sourcePackage = givenAPackage(module);

        const validations = await useCase.execute("LOCAL", sourcePackage, module, "2.38.0", preSuppliedContents);

        expect(validations).toEqual([]);

        const savedPackage = savedObjectsByNamespace[Namespace.PACKAGES] as Package;
        expect(savedPackage.contents).toEqual(preSuppliedContents);
    });

    it("should save the module with updated lastPackageVersion", async () => {
        const { useCase, savedObjectsByNamespace } = givenACreatePackageUseCase();
        const module = givenAModule();
        const sourcePackage = givenAPackage(module);

        await useCase.execute("LOCAL", sourcePackage, module, "2.38.0");

        const savedModule = savedObjectsByNamespace[Namespace.MODULES] as MetadataModule;
        expect(savedModule.lastPackageVersion).toEqual("1.0.0");
    });
});

function givenACreatePackageUseCase() {
    const testUser: User = {
        id: "user1",
        name: "Test User",
        email: "test@example.com",
        username: "testuser",
        userGroups: [],
        organisationUnits: [],
        dataViewOrganisationUnits: [],
        isGlobalAdmin: false,
        isAppConfigurator: false,
        isAppExecutor: false,
    };

    const localInstance = Instance.build({
        type: "local",
        name: "Local",
        url: "http://localhost:8080",
    });

    const mockedMetadataPayloadBuilder = mock(MetadataPayloadBuilder);
    when(mockedMetadataPayloadBuilder.build(anything())).thenResolve(builtPayload);

    // Records what was actually passed to saveObjectInCollection, keyed by namespace
    // (the contract the use case interacts through), instead of relying on call order.
    const savedObjectsByNamespace: Record<string, unknown> = {};
    const mockedStorageClient = mock(StorageClient);
    when(mockedStorageClient.saveObjectInCollection(anything(), anything())).thenCall(
        (namespace: string, element: unknown) => {
            savedObjectsByNamespace[namespace] = element;
            return Promise.resolve();
        }
    );

    const mockedConfigRepository = mock<StorageClientRepository>();
    when(mockedConfigRepository.getStorageClientPromise()).thenResolve(instance(mockedStorageClient));

    const mockedRepositoryFactory = mock(DynamicRepositoryFactory);
    when(mockedRepositoryFactory.configRepository(anything())).thenReturn(instance(mockedConfigRepository));

    const mockedTransformationRepository = mock<TransformationRepository>();
    when(mockedTransformationRepository.mapPackageTo(anything(), anything(), anything())).thenCall(
        (_destination: number, payload: MetadataPackage) => payload
    );

    const mockedUserRepository = mock<UserRepository>();
    when(mockedUserRepository.getCurrent()).thenResolve(testUser);

    const useCase = new CreatePackageUseCase(
        instance(mockedMetadataPayloadBuilder),
        instance(mockedRepositoryFactory),
        instance(mockedTransformationRepository),
        instance(mockedUserRepository),
        localInstance
    );

    return { useCase, savedObjectsByNamespace };
}

function givenAModule(overrides?: Partial<MetadataModule>): MetadataModule {
    return MetadataModule.build({
        id: "mod1",
        name: "Test Module",
        instance: "LOCAL",
        department: { id: "dept1", name: "Department 1" },
        metadataIds: ["ds1"],
        lastPackageVersion: "0.0.0",
        ...overrides,
    });
}

function givenAPackage(module: MetadataModule, overrides?: Partial<Package>): Package {
    return Package.build({
        id: "pkg1",
        name: "Test Package",
        description: "A test package",
        version: "1.0.0",
        dhisVersion: "2.38.0",
        module: {
            id: module.id,
            name: module.name,
            instance: module.instance,
            department: module.department,
        },
        contents: {},
        ...overrides,
    });
}

export {};
