import { Mock } from "vitest";
import { CreatePackageUseCase } from "../CreatePackageUseCase";
import { Package } from "../../entities/Package";
import { MetadataModule } from "../../../modules/entities/MetadataModule";
import { Instance } from "../../../instance/entities/Instance";
import { MetadataPayloadBuilder } from "../../../metadata/builders/MetadataPayloadBuilder";
import { DynamicRepositoryFactory } from "../../../common/factories/DynamicRepositoryFactory";
import { TransformationRepository } from "../../../transformations/repositories/TransformationRepository";
import { MetadataPackage } from "../../../metadata/entities/MetadataEntities";
import { User } from "../../../user/entities/User";
import { StorageClient } from "../../../storage/repositories/StorageClient";
import { Namespace } from "../../../../data/storage/Namespaces";

describe("CreatePackageUseCase", () => {
    let metadataPayloadBuilder: { build: Mock };
    let repositoryFactory: DynamicRepositoryFactory;
    let transformationRepository: TransformationRepository;
    let localInstance: Instance;
    let mockStorageClient: { saveObjectInCollection: Mock };

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

    const builtPayload: MetadataPackage = {
        dataSets: [{ id: "ds1", name: "DataSet 1" } as any],
    };

    const preSuppliedContents: MetadataPackage = {
        indicators: [{ id: "ind1", name: "Indicator 1" } as any],
    };

    beforeEach(() => {
        metadataPayloadBuilder = {
            build: vi.fn().mockResolvedValue(builtPayload),
        };

        mockStorageClient = {
            saveObjectInCollection: vi.fn().mockResolvedValue(undefined),
        };

        transformationRepository = {
            mapPackageTo: vi.fn().mockImplementation((_destination, payload, _transformations, _origin?) => payload),
            mapPackageFrom: vi.fn().mockImplementation((_origin, payload, _transformations, _destination?) => payload),
        };

        localInstance = Instance.build({
            type: "local",
            name: "Local",
            url: "http://localhost:8080",
        });

        repositoryFactory = new DynamicRepositoryFactory();

        repositoryFactory.bindByInstance(
            "configRepository",
            (_instance: Instance) => ({
                getStorageClient: vi.fn(),
                getUserStorageClient: vi.fn(),
                changeStorageClient: vi.fn(),
                getStorageClientPromise: vi.fn().mockResolvedValue(mockStorageClient),
            }),
        );

        repositoryFactory.bindByInstance(
            "userRepository",
            (_instance: Instance) => ({
                getCurrent: vi.fn().mockResolvedValue(testUser),
            }),
        );
    });

    function buildTestModule(overrides?: Partial<MetadataModule>): MetadataModule {
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

    function buildTestPackage(overrides?: Partial<Package>): Package {
        const module = buildTestModule();
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

    it("should use payload from metadataPayloadBuilder.build() when contents is not provided", async () => {
        const module = buildTestModule();
        const sourcePackage = buildTestPackage();
        const dhisVersion = "2.38.0";

        const useCase = new CreatePackageUseCase(
            metadataPayloadBuilder as unknown as MetadataPayloadBuilder,
            repositoryFactory,
            transformationRepository,
            localInstance,
        );

        const validations = await useCase.execute("LOCAL", sourcePackage, module, dhisVersion);

        expect(validations).toEqual([]);
        expect(metadataPayloadBuilder.build).toHaveBeenCalledTimes(1);

        const savedPackageCall = (mockStorageClient.saveObjectInCollection as Mock).mock.calls.find(
            ([namespace]: [string]) => namespace === Namespace.PACKAGES
        );

        expect(savedPackageCall).toBeDefined();
        const savedPackage = savedPackageCall![1] as Package;
        expect(savedPackage.contents).toEqual(builtPayload);
    });

    it("should verify the built payload is a resolved MetadataPackage, not a Promise", async () => {
        const module = buildTestModule();
        const sourcePackage = buildTestPackage();
        const dhisVersion = "2.38.0";

        const useCase = new CreatePackageUseCase(
            metadataPayloadBuilder as unknown as MetadataPayloadBuilder,
            repositoryFactory,
            transformationRepository,
            localInstance,
        );

        await useCase.execute("LOCAL", sourcePackage, module, dhisVersion);

        const savedPackageCall = (mockStorageClient.saveObjectInCollection as Mock).mock.calls.find(
            ([namespace]: [string]) => namespace === Namespace.PACKAGES
        );

        expect(savedPackageCall).toBeDefined();
        const savedPackage = savedPackageCall![1] as Package;

        // Verify the contents is the resolved value, not a Promise or empty object
        expect(savedPackage.contents).not.toBeInstanceOf(Promise);
        expect(savedPackage.contents).not.toEqual({});
        expect(savedPackage.contents).toHaveProperty("dataSets");
        expect(savedPackage.contents.dataSets).toEqual([{ id: "ds1", name: "DataSet 1" }]);
    });

    it("should use provided contents directly without calling metadataPayloadBuilder.build()", async () => {
        const module = buildTestModule();
        const sourcePackage = buildTestPackage();
        const dhisVersion = "2.38.0";

        const useCase = new CreatePackageUseCase(
            metadataPayloadBuilder as unknown as MetadataPayloadBuilder,
            repositoryFactory,
            transformationRepository,
            localInstance,
        );

        const validations = await useCase.execute("LOCAL", sourcePackage, module, dhisVersion, preSuppliedContents);

        expect(validations).toEqual([]);
        expect(metadataPayloadBuilder.build).not.toHaveBeenCalled();

        const savedPackageCall = (mockStorageClient.saveObjectInCollection as Mock).mock.calls.find(
            ([namespace]: [string]) => namespace === Namespace.PACKAGES
        );

        expect(savedPackageCall).toBeDefined();
        const savedPackage = savedPackageCall![1] as Package;
        expect(savedPackage.contents).toEqual(preSuppliedContents);
    });

    it("should pass the payload through transformationRepository.mapPackageTo()", async () => {
        const module = buildTestModule();
        const sourcePackage = buildTestPackage();
        const dhisVersion = "2.38.0";

        const useCase = new CreatePackageUseCase(
            metadataPayloadBuilder as unknown as MetadataPayloadBuilder,
            repositoryFactory,
            transformationRepository,
            localInstance,
        );

        await useCase.execute("LOCAL", sourcePackage, module, dhisVersion);

        expect(transformationRepository.mapPackageTo).toHaveBeenCalledTimes(1);
        expect(transformationRepository.mapPackageTo).toHaveBeenCalledWith(
            38,
            builtPayload,
            expect.any(Array),
        );
    });

    it("should save the module with updated lastPackageVersion", async () => {
        const module = buildTestModule();
        const sourcePackage = buildTestPackage();
        const dhisVersion = "2.38.0";

        const useCase = new CreatePackageUseCase(
            metadataPayloadBuilder as unknown as MetadataPayloadBuilder,
            repositoryFactory,
            transformationRepository,
            localInstance,
        );

        await useCase.execute("LOCAL", sourcePackage, module, dhisVersion);

        const savedModuleCall = (mockStorageClient.saveObjectInCollection as Mock).mock.calls.find(
            ([namespace]: [string]) => namespace === Namespace.MODULES
        );

        expect(savedModuleCall).toBeDefined();
        const savedModule = savedModuleCall![1] as MetadataModule;
        expect(savedModule.lastPackageVersion).toEqual("1.0.0");
    });
});
