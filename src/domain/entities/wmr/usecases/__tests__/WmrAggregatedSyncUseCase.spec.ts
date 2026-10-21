import { givenAggregatedRepositoryFactory } from "../../../../aggregated/builders/__tests__/mocks/givenAggregatedRepositoryFactory";
import { DataSynchronizationParams } from "../../../../aggregated/entities/DataSynchronizationParams";
import { DataValue } from "../../../../aggregated/entities/DataValue";
import { Instance } from "../../../../instance/entities/Instance";
import { DataElement, Indicator, MetadataPackage } from "../../../../metadata/entities/MetadataEntities";
import { WmrAggregatedSyncOptions, WmrAggregatedSyncUseCase } from "../WmrAggregatedSyncUseCase";

const localInstance = Instance.build({
    id: "LOCAL",
    name: "Local instance",
    type: "local",
    url: "http://localhost:8080",
});

const sourceDataSetId = "sourceDataSet";
const countrySyncDataSetId = "countrySyncDataSet";
const country = "ImspTQPwCqd";
const badjia = "YuQRtpLP10I";
const baoma = "vWbkYPRmKyS";
const defaultCategoryOptionCombo = "HllvX50cXC0";
const publicCategoryOptionCombo = "XS0jDrjreLW";
const privateCategoryOptionCombo = "Y0HU7KNK0qH";

const sourceDataElement = givenDataElement("sourceDataElement", sourceDataSetId);
const countrySyncDataElement = givenDataElement("countrySyncDataElement", countrySyncDataSetId);
const indicator = { id: "sourceIndicator", name: "Source indicator" } as unknown as Indicator;

describe("WmrAggregatedSyncUseCase", () => {
    describe("Global", () => {
        it("copies the raw yearly values of the source when no indicator is mapped", async () => {
            const rawValue = givenValue({ orgUnit: country, period: "2025", value: "600" });
            const { useCase, aggregatedRepository } = givenUseCase({
                dataParams: { orgUnitPaths: [`/${country}`], period: "LAST_YEAR" },
                metadata: { dataElements: [sourceDataElement] },
                options: { periods: ["2025"] },
            });
            aggregatedRepository.getAggregated.mockResolvedValueOnce({ dataValues: [] });
            aggregatedRepository.getAggregated.mockResolvedValueOnce({ dataValues: [rawValue] });

            await expect(useCase.buildPayload()).resolves.toEqual({ dataValues: [rawValue] });
            expect(
                aggregatedRepository.getAggregated.mock.calls.map(([, dataSets, , periods]) => ({
                    dataSets,
                    periods,
                }))
            ).toEqual([
                { dataSets: [], periods: ["2025"] },
                { dataSets: [sourceDataSetId], periods: ["2025"] },
            ]);
            expect(aggregatedRepository.getAnalytics).not.toHaveBeenCalled();
        });

        it("reads a data element with its category option combos and an indicator from yearly analytics", async () => {
            const dataParams = givenAggregationParams([`/${country}`], "YEARLY");
            const dataElementValues = [
                givenValue({ orgUnit: country, period: "2025", value: "199878" }, publicCategoryOptionCombo),
                givenValue({ orgUnit: country, period: "2025", value: "53391" }, privateCategoryOptionCombo),
            ];
            const indicatorValue = givenIndicatorValue({ orgUnit: country, period: "2025", value: "500" });
            const { useCase, aggregatedRepository } = givenUseCase({
                dataParams,
                metadata: { dataElements: [sourceDataElement], indicators: [indicator] },
                options: { periods: ["2025"] },
            });
            aggregatedRepository.getAnalytics.mockResolvedValueOnce({ dataValues: dataElementValues });
            aggregatedRepository.getAnalytics.mockResolvedValueOnce({ dataValues: [indicatorValue] });

            await expect(useCase.buildPayload()).resolves.toEqual({
                dataValues: [...dataElementValues, indicatorValue],
            });
            expect(aggregatedRepository.getAnalytics.mock.calls).toEqual([
                [
                    {
                        dataParams,
                        dimensionIds: [sourceDataElement.id],
                        includeCategories: true,
                        includeCategoryOptionCombos: true,
                    },
                ],
                [{ dataParams, dimensionIds: [indicator.id], includeCategories: false }],
            ]);
            expect(aggregatedRepository.getAggregated).not.toHaveBeenCalled();
        });
    });

    describe("Regional", () => {
        it("sums the monthly analytics values of each parent into the target period", async () => {
            const { useCase, aggregatedRepository } = givenUseCase({
                dataParams: givenAggregationParams([`/${country}/${badjia}`, `/${country}/${baoma}`], "MONTHLY"),
                metadata: { dataElements: [sourceDataElement] },
                options: { targetPeriod: "2025" },
            });
            aggregatedRepository.getAnalytics.mockResolvedValueOnce({
                dataValues: [
                    givenValue({ orgUnit: badjia, period: "202505", value: "7" }),
                    givenValue({ orgUnit: baoma, period: "202502", value: "2" }),
                    givenValue({ orgUnit: badjia, period: "202512", value: "16" }),
                    givenValue({ orgUnit: baoma, period: "202512", value: "6" }),
                ],
            });

            await expect(useCase.buildPayload()).resolves.toEqual({
                dataValues: [
                    givenValue({ orgUnit: badjia, period: "2025", value: "23" }),
                    givenValue({ orgUnit: baoma, period: "2025", value: "8" }),
                ],
            });
        });

        it("sums the monthly values of an indicator of a parent into one yearly value", async () => {
            const { useCase, aggregatedRepository } = givenUseCase({
                dataParams: givenAggregationParams([`/${country}/${badjia}`], "MONTHLY"),
                metadata: { indicators: [indicator] },
                options: { targetPeriod: "2025" },
            });
            aggregatedRepository.getAnalytics.mockResolvedValueOnce({ dataValues: [] });
            aggregatedRepository.getAnalytics.mockResolvedValueOnce({
                dataValues: [
                    givenIndicatorValue({ orgUnit: badjia, period: "202505", value: "7" }),
                    givenIndicatorValue({ orgUnit: badjia, period: "202512", value: "3" }),
                ],
            });

            await expect(useCase.buildPayload()).resolves.toEqual({
                dataValues: [givenIndicatorValue({ orgUnit: badjia, period: "2025", value: "10" })],
            });
        });
    });

    describe("Submit", () => {
        it("reads the raw values of the Country Sync in the given periods", async () => {
            const countrySyncValue = {
                ...givenValue({ orgUnit: country, period: "2025", value: "23" }),
                dataElement: countrySyncDataElement.id,
            };
            const { useCase, aggregatedRepository } = givenUseCase({
                dataParams: { orgUnitPaths: [`/${country}`], period: "LAST_YEAR" },
                metadata: { dataElements: [countrySyncDataElement] },
                options: { periods: ["2025"] },
            });
            aggregatedRepository.getAggregated.mockResolvedValueOnce({ dataValues: [] });
            aggregatedRepository.getAggregated.mockResolvedValueOnce({ dataValues: [countrySyncValue] });

            await expect(useCase.buildPayload()).resolves.toEqual({ dataValues: [countrySyncValue] });
            expect(aggregatedRepository.getAggregated).toHaveBeenLastCalledWith(
                { orgUnitPaths: [`/${country}`], period: "LAST_YEAR" },
                [countrySyncDataSetId],
                [],
                ["2025"]
            );
        });
    });
});

type ValueAttrs = Pick<DataValue, "orgUnit" | "period" | "value">;

function givenValue(attrs: ValueAttrs, categoryOptionCombo = defaultCategoryOptionCombo): DataValue {
    return {
        dataElement: sourceDataElement.id,
        categoryOptionCombo,
        attributeOptionCombo: defaultCategoryOptionCombo,
        ...attrs,
    };
}

function givenIndicatorValue(attrs: ValueAttrs): DataValue {
    return { dataElement: indicator.id, categoryOptionCombo: defaultCategoryOptionCombo, ...attrs };
}

function givenDataElement(id: string, dataSetId: string): DataElement {
    return {
        id,
        name: id,
        valueType: "NUMBER",
        dataSetElements: [{ dataSet: { id: dataSetId } }],
        dataElementGroups: [],
    } as unknown as DataElement;
}

function givenAggregationParams(
    orgUnitPaths: string[],
    aggregationType: NonNullable<DataSynchronizationParams["aggregationType"]>
): DataSynchronizationParams {
    return { orgUnitPaths, period: "LAST_YEAR", enableAggregation: true, aggregationType };
}

function givenUseCase(attrs: {
    dataParams: DataSynchronizationParams;
    metadata: MetadataPackage;
    options: WmrAggregatedSyncOptions;
}) {
    const { repositoryFactory, aggregatedRepository } = givenAggregatedRepositoryFactory(localInstance, attrs.metadata);
    const metadataIds = [
        ...(attrs.metadata.dataElements ?? []).map(({ id }) => id),
        ...(attrs.metadata.indicators ?? []).map(({ id }) => id),
    ];
    const useCase = new WmrAggregatedSyncUseCase(
        {
            originInstance: localInstance.id,
            targetInstances: [localInstance.id],
            metadataIds,
            excludedIds: [],
            dataParams: attrs.dataParams,
        },
        repositoryFactory,
        localInstance
    );
    useCase.periods = attrs.options.periods;
    useCase.targetPeriod = attrs.options.targetPeriod;

    return { useCase, aggregatedRepository };
}
