import { anything, instance, mock, when } from "ts-mockito";
import { DynamicRepositoryFactory } from "../../../common/factories/DynamicRepositoryFactory";
import { Instance } from "../../../instance/entities/Instance";
import { MetadataRepository } from "../../../metadata/repositories/MetadataRepository";
import { MetadataMappingDictionary } from "../../entities/MetadataMapping";
import { ApplyMappingUseCase } from "../ApplyMappingUseCase";

describe("ApplyMappingUseCase", () => {
    it("rejects instead of returning an empty mapping when the metadata cannot be fetched", async () => {
        const { useCase, originInstance, destinationInstance } = givenAnApplyMappingUseCase({
            metadataError: new Error("Read timed out"),
        });

        const update = { selection: ["indicator1"], mappingType: "aggregatedDataElements", mappedId: "dataElement1" };
        const result = useCase.execute(originInstance, destinationInstance, existingMapping, [update], false);

        await expect(result).rejects.toThrow("Read timed out");
    });

    it("keeps the other mappings when one mapping is removed", async () => {
        const { useCase, originInstance, destinationInstance } = givenAnApplyMappingUseCase({});

        const update = { selection: ["indicator1"], mappingType: "aggregatedDataElements", mappedId: undefined };
        const newMapping = await useCase.execute(originInstance, destinationInstance, existingMapping, [update], false);

        expect(newMapping.aggregatedDataElements?.["indicator1"]).toBeUndefined();
        expect(newMapping.aggregatedDataElements?.["dataElement2"]?.mappedId).toEqual("remoteDataElement2");
        expect(newMapping.organisationUnits?.["orgUnit1"]?.mappedId).toEqual("remoteOrgUnit1");
    });
});

const existingMapping: MetadataMappingDictionary = {
    aggregatedDataElements: {
        indicator1: { mappedId: "remoteDataElement1", mapping: {} },
        dataElement2: { mappedId: "remoteDataElement2", mapping: {} },
    },
    organisationUnits: {
        orgUnit1: { mappedId: "remoteOrgUnit1", mapping: {} },
    },
};

function givenAnApplyMappingUseCase(options: { metadataError?: Error }) {
    const originInstance = Instance.build({ type: "local", name: "Origin", url: "http://origin.test" });
    const destinationInstance = Instance.build({ type: "dhis", name: "Destination", url: "http://destination.test" });

    const mockedMetadataRepository = mock<MetadataRepository>();
    if (options.metadataError) {
        when(mockedMetadataRepository.getMetadataByIds(anything(), anything(), anything())).thenReject(
            options.metadataError
        );
    } else {
        when(mockedMetadataRepository.getMetadataByIds(anything(), anything(), anything())).thenResolve({});
    }

    const mockedRepositoryFactory = mock(DynamicRepositoryFactory);
    when(mockedRepositoryFactory.metadataRepository(anything())).thenReturn(instance(mockedMetadataRepository));

    const useCase = new ApplyMappingUseCase(instance(mockedRepositoryFactory), originInstance);

    return { useCase, originInstance, destinationInstance };
}

export {};
