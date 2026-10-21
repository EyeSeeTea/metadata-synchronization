import { vi } from "vitest";
import { DynamicRepositoryFactory } from "../../../../common/factories/DynamicRepositoryFactory";
import { Instance } from "../../../../instance/entities/Instance";
import { MetadataPackage } from "../../../../metadata/entities/MetadataEntities";

export function givenAggregatedRepositoryFactory(localInstance: Instance, metadata: MetadataPackage) {
    const aggregatedRepository = {
        getAnalytics: vi.fn().mockResolvedValue({ dataValues: [] }),
        getAggregated: vi.fn().mockResolvedValue({ dataValues: [] }),
    };
    const repositoryFactory = {
        instanceRepository: () => ({ getById: async () => localInstance }),
        metadataRepository: () => ({ getMetadataByIds: async () => metadata }),
        aggregatedRepository: () => aggregatedRepository,
    } as unknown as DynamicRepositoryFactory;

    return { repositoryFactory, aggregatedRepository };
}
