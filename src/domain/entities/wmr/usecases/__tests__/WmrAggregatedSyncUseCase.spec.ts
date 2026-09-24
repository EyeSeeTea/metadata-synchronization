import { vi } from "vitest";
import { AggregatedRepository } from "../../../../aggregated/repositories/AggregatedRepository";
import { DynamicRepositoryFactory } from "../../../../common/factories/DynamicRepositoryFactory";
import { Instance } from "../../../../instance/entities/Instance";
import { DataElement, MetadataPackage } from "../../../../metadata/entities/MetadataEntities";
import { SynchronizationBuilder } from "../../../../synchronization/entities/SynchronizationBuilder";
import { WmrAggregatedSyncUseCase } from "../WmrAggregatedSyncUseCase";

describe("WmrAggregatedSyncUseCase", () => {
    const localInstance = Instance.build({
        id: "LOCAL",
        name: "Local instance",
        type: "local",
        url: "http://localhost:8080",
    });

    const dataElement = {
        id: "sourceDataElement",
        name: "Source data element",
        valueType: "NUMBER",
        dataSetElements: [{ dataSet: { id: "sourceDataSet" } }],
        dataElementGroups: [],
    } as unknown as DataElement;

    const orgUnit = "sourceOrgUnit";
    const defaultCategoryOptionCombo = "HllvX50cXC0";
    const publicCategoryOptionCombo = "XS0jDrjreLW";
    const privateCategoryOptionCombo = "Y0HU7KNK0qH";

    it("keeps the category option combo disaggregation of the yearly analytics values", async () => {
        const builder = givenBuilder({ enableAggregation: true, aggregationType: "YEARLY" });
        const { useCase, aggregatedRepository } = givenUseCase(builder);
        const yearlyValues = [
            {
                dataElement: dataElement.id,
                period: "2025",
                orgUnit,
                categoryOptionCombo: publicCategoryOptionCombo,
                attributeOptionCombo: defaultCategoryOptionCombo,
                value: "199878",
            },
            {
                dataElement: dataElement.id,
                period: "2025",
                orgUnit,
                categoryOptionCombo: privateCategoryOptionCombo,
                attributeOptionCombo: defaultCategoryOptionCombo,
                value: "53391",
            },
        ];

        vi.mocked(aggregatedRepository.getAnalytics).mockResolvedValue({ dataValues: yearlyValues });

        await expect(useCase.buildPayload()).resolves.toEqual({ dataValues: yearlyValues });
        expect(aggregatedRepository.getAnalytics).toHaveBeenCalledWith({
            dataParams: builder.dataParams ?? {},
            dimensionIds: [dataElement.id],
            includeCategories: true,
            includeCategoryOptionCombos: true,
        });
        expect(aggregatedRepository.getAggregated).not.toHaveBeenCalled();
    });

    it("retains raw data-value retrieval when aggregation is disabled", async () => {
        const builder = givenBuilder({ enableAggregation: false });
        const { useCase, aggregatedRepository } = givenUseCase(builder);
        const rawValue = {
            dataElement: dataElement.id,
            period: "2025W01",
            orgUnit,
            categoryOptionCombo: defaultCategoryOptionCombo,
            attributeOptionCombo: defaultCategoryOptionCombo,
            value: "7",
        };

        vi.mocked(aggregatedRepository.getAggregated)
            .mockResolvedValueOnce({ dataValues: [] })
            .mockResolvedValueOnce({ dataValues: [rawValue] });

        await expect(useCase.buildPayload()).resolves.toEqual({ dataValues: [rawValue] });
        expect(aggregatedRepository.getAnalytics).not.toHaveBeenCalled();
    });

    function givenBuilder(dataParams: NonNullable<SynchronizationBuilder["dataParams"]>): SynchronizationBuilder {
        return {
            originInstance: localInstance.id,
            targetInstances: [localInstance.id],
            metadataIds: [dataElement.id],
            excludedIds: [],
            dataParams: {
                orgUnitPaths: [`/${orgUnit}`],
                period: "LAST_YEAR",
                ...dataParams,
            },
        };
    }

    function givenUseCase(builder: SynchronizationBuilder) {
        const aggregatedRepository = {
            getAnalytics: vi.fn(),
            getAggregated: vi.fn(),
        } as unknown as AggregatedRepository;
        const repositoryFactory = {} as DynamicRepositoryFactory;

        return {
            useCase: new TestWmrAggregatedSyncUseCase(builder, repositoryFactory, localInstance, aggregatedRepository, {
                dataElements: [dataElement],
            }),
            aggregatedRepository,
        };
    }
});

class TestWmrAggregatedSyncUseCase extends WmrAggregatedSyncUseCase {
    constructor(
        builder: SynchronizationBuilder,
        repositoryFactory: DynamicRepositoryFactory,
        localInstance: Instance,
        private readonly aggregatedRepository: AggregatedRepository,
        private readonly metadata: MetadataPackage<DataElement>
    ) {
        super(builder, repositoryFactory, localInstance);
    }

    protected async getAggregatedRepository(): Promise<AggregatedRepository> {
        return this.aggregatedRepository;
    }

    public async extractMetadata<T>(): Promise<MetadataPackage<T>> {
        return this.metadata as unknown as MetadataPackage<T>;
    }
}
