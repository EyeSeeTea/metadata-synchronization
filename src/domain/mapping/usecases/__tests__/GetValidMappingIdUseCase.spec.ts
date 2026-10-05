import { anything, instance, mock, when } from "ts-mockito";
import { DynamicRepositoryFactory } from "../../../common/factories/DynamicRepositoryFactory";
import { Instance } from "../../../instance/entities/Instance";
import { MetadataPackage } from "../../../metadata/entities/MetadataEntities";
import { MetadataRepository } from "../../../metadata/repositories/MetadataRepository";
import { GetValidMappingIdUseCase } from "../GetValidMappingIdUseCase";

describe("GetValidMappingIdUseCase", () => {
    it("should include the destination data element's own category option combos as valid mapping ids", async () => {
        const { useCase, destinationInstance } = givenAGetValidMappingIdUseCase();

        const validIds = await useCase.execute(destinationInstance, "dataElementGender");

        expect(validIds).toEqual(expect.arrayContaining(["cocMale", "cocFemale"]));
    });
});

function givenAGetValidMappingIdUseCase() {
    const destinationInstance = Instance.build({
        type: "local",
        name: "Destination",
        url: "http://destination.test",
    });

    const destinationMetadata: MetadataPackage = {
        dataElements: [
            {
                id: "dataElementGender",
                name: "Data element with gender",
                categoryCombo: {
                    id: "genderCC",
                    name: "Gender",
                    categories: [],
                    categoryOptionCombos: [
                        { id: "cocMale", name: "Male" },
                        { id: "cocFemale", name: "Female" },
                    ],
                },
            } as any,
        ],
    };

    const mockedMetadataRepository = mock<MetadataRepository>();
    when(mockedMetadataRepository.getMetadataByIds(anything(), anything(), anything())).thenResolve(
        destinationMetadata
    );
    when(mockedMetadataRepository.getDefaultIds()).thenResolve(["default"]);

    const mockedRepositoryFactory = mock(DynamicRepositoryFactory);
    when(mockedRepositoryFactory.metadataRepository(anything())).thenReturn(instance(mockedMetadataRepository));

    const useCase = new GetValidMappingIdUseCase(instance(mockedRepositoryFactory), destinationInstance);

    return { useCase, destinationInstance };
}

export {};
