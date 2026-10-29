import { Instance } from "../../../instance/entities/Instance";
import { DataElement, Indicator } from "../../../metadata/entities/MetadataEntities";
import { SynchronizationBuilder } from "../../../synchronization/entities/SynchronizationBuilder";
import { DataSynchronizationParams } from "../../entities/DataSynchronizationParams";
import { AggregatedPayloadBuilder, AggregatedPayloadBuildOptions } from "../AggregatedPayloadBuilder";
import { givenAggregatedRepositoryFactory } from "./mocks/givenAggregatedRepositoryFactory";

const localInstance = Instance.build({ id: "LOCAL", name: "Local instance", type: "local", url: "http://localhost" });

const dataSetId = "sourceDataSet";

const dataElement = {
    id: "sourceDataElement",
    name: "Source data element",
    valueType: "NUMBER",
    dataSetElements: [{ dataSet: { id: dataSetId } }],
    dataElementGroups: [],
} as unknown as DataElement;

const indicator = { id: "sourceIndicator", name: "Source indicator" } as unknown as Indicator;

const dataValue = {
    dataElement: dataElement.id,
    period: "2025",
    orgUnit: "orgUnit",
    categoryOptionCombo: "coc",
    attributeOptionCombo: "aoc",
    value: "3",
};

const indicatorValue = { ...dataValue, dataElement: indicator.id, categoryOptionCombo: "default", value: "5" };

describe("AggregatedPayloadBuilder", () => {
    describe("without aggregation", () => {
        const dataParams: DataSynchronizationParams = { orgUnitPaths: ["/orgUnit"], period: "LAST_YEAR" };

        it("reads the raw values of the data sets of the data elements by date range", async () => {
            const { build, aggregatedRepository } = givenBuilder(dataParams);
            aggregatedRepository.getAggregated.mockResolvedValueOnce({ dataValues: [] });
            aggregatedRepository.getAggregated.mockResolvedValueOnce({ dataValues: [dataValue] });

            await expect(build()).resolves.toEqual({ dataValues: [dataValue] });
            expect(aggregatedRepository.getAggregated.mock.calls).toEqual([
                [dataParams, [], [], undefined],
                [dataParams, [dataSetId], [], undefined],
            ]);
        });

        it("reads the raw values of the given periods", async () => {
            const { build, aggregatedRepository } = givenBuilder(dataParams);

            await build({ periods: ["2025"] });

            expect(aggregatedRepository.getAggregated.mock.calls).toEqual([
                [dataParams, [], [], ["2025"]],
                [dataParams, [dataSetId], [], ["2025"]],
            ]);
        });
    });

    describe("with aggregation", () => {
        const dataParams: DataSynchronizationParams = {
            orgUnitPaths: ["/orgUnit"],
            period: "LAST_YEAR",
            enableAggregation: true,
            aggregationType: "YEARLY",
        };

        it("reads data elements and indicators from analytics without the category option combos", async () => {
            const { build, aggregatedRepository } = givenBuilder(dataParams);
            aggregatedRepository.getAnalytics.mockResolvedValueOnce({ dataValues: [dataValue] });
            aggregatedRepository.getAnalytics.mockResolvedValueOnce({ dataValues: [indicatorValue] });

            await expect(build()).resolves.toEqual({ dataValues: [dataValue, indicatorValue] });
            expect(aggregatedRepository.getAnalytics.mock.calls).toEqual([
                [
                    {
                        dataParams,
                        dimensionIds: [dataElement.id],
                        includeCategories: true,
                        includeCategoryOptionCombos: undefined,
                    },
                ],
                [{ dataParams, dimensionIds: [indicator.id], includeCategories: false }],
            ]);
            expect(aggregatedRepository.getAggregated).not.toHaveBeenCalled();
        });

        it("requests the category option combos of the data elements only", async () => {
            const { build, aggregatedRepository } = givenBuilder(dataParams);

            await build({ includeCategoryOptionCombos: true, periods: ["2025"] });

            expect(aggregatedRepository.getAnalytics.mock.calls).toEqual([
                [
                    {
                        dataParams,
                        dimensionIds: [dataElement.id],
                        includeCategories: true,
                        includeCategoryOptionCombos: true,
                    },
                ],
                [{ dataParams, dimensionIds: [indicator.id], includeCategories: false }],
            ]);
        });
    });
});

function givenBuilder(dataParams: DataSynchronizationParams) {
    const { repositoryFactory, aggregatedRepository } = givenAggregatedRepositoryFactory(localInstance, {
        dataElements: [dataElement],
        indicators: [indicator],
    });
    const syncBuilder: SynchronizationBuilder = {
        originInstance: localInstance.id,
        targetInstances: [localInstance.id],
        metadataIds: [dataElement.id, indicator.id],
        excludedIds: [],
        dataParams,
    };
    const payloadBuilder = new AggregatedPayloadBuilder(repositoryFactory, localInstance);

    return {
        build: (options?: AggregatedPayloadBuildOptions) => payloadBuilder.build(syncBuilder, undefined, options),
        aggregatedRepository,
    };
}
