import _ from "lodash";
import memoize from "nano-memoize";
import { debug } from "../../../../utils/debug";
import { Instance } from "../../../instance/entities/Instance";
import { DataElement } from "../../../metadata/entities/MetadataEntities";
import { SynchronizationResult } from "../../../reports/entities/SynchronizationResult";
import { GenericSyncUseCase } from "../../../synchronization/usecases/GenericSyncUseCase";
import { buildMetadataDictionary } from "../../../synchronization/utils";
import { AggregatedPackage } from "../../../aggregated/entities/AggregatedPackage";
import { DataValue } from "../../../aggregated/entities/DataValue";
import { createAggregatedPayloadMapper } from "../../../aggregated/mapper/AggregatedPayloadMapperFactory";
import { AggregatedPayloadBuilder } from "../../../aggregated/builders/AggregatedPayloadBuilder";
import { AggregatedMetadatafields } from "../../../aggregated/usecases/AggregatedSyncUseCase";
import { promiseMap } from "../../../../utils/common";
import { SynchronizationReport } from "../../../reports/entities/SynchronizationReport";
import { Maybe } from "../../../../types/utils";
import { Id } from "../../../common/entities/Schemas";
import { sumIntoPeriod } from "../entities/WmrSyncFlow";

export type WmrAggregatedSyncOptions = Readonly<{
    orgUnitIdOverride?: Maybe<Id>;
    periods?: ReadonlyArray<string>;
    targetPeriod?: string;
    targetDataSetId?: Id;
}>;

// This is a WMR PoC, cloned from AggregatedSyncUseCase, supporting org unit mapping with orgUnitIdOverride
export class WmrAggregatedSyncUseCase extends GenericSyncUseCase {
    public readonly type = "aggregated";
    public readonly fields = AggregatedMetadatafields;

    public orgUnitIdOverride: Maybe<Id>;
    public periods: ReadonlyArray<string> | undefined;
    public targetPeriod: Maybe<string>;
    public targetDataSetId: Maybe<Id>;

    // TODO: review typings for this generator
    public async *execute(
        options: WmrAggregatedSyncOptions = {}
    ): AsyncGenerator<
        | { message: string; syncReport?: undefined; done?: undefined }
        | { syncReport: SynchronizationReport; message?: undefined; done?: undefined }
        | { syncReport: SynchronizationReport; done: boolean; message?: undefined },
        SynchronizationReport,
        unknown
    > {
        this.orgUnitIdOverride = options.orgUnitIdOverride;
        this.periods = options.periods;
        this.targetPeriod = options.targetPeriod;
        this.targetDataSetId = options.targetDataSetId;
        yield* super.execute();
        return undefined as unknown as SynchronizationReport;
    }

    private readonly payloadBuilder = new AggregatedPayloadBuilder(this.repositoryFactory, this.localInstance);

    public buildPayload = memoize(async (remoteInstance?: Instance): Promise<{ dataValues: DataValue[] }> => {
        const { dataValues = [] } = await this.payloadBuilder.build(this.builder, remoteInstance, {
            includeCategoryOptionCombos: true,
            periods: this.periods,
        });
        return { dataValues: this.targetPeriod ? sumIntoPeriod(dataValues, this.targetPeriod) : dataValues };
    });

    public async postPayload(instance: Instance): Promise<SynchronizationResult[]> {
        const { dataParams = {} } = this.builder;

        const previousOriginalPayload = await this.buildPayload();

        const originalPayload = dataParams.dryRun
            ? previousOriginalPayload
            : await this.manageDataElementWithFileType(previousOriginalPayload, instance);

        const mappedPayload = await this.mapPayload(instance, originalPayload);

        const existingPayload = dataParams.ignoreDuplicateExistingValues
            ? await this.mapPayload(instance, await this.buildPayload(instance))
            : { dataValues: [] };

        const payload = this.withTargetDataSet(
            this.overrideOrgUnitId(this.filterPayload(mappedPayload, existingPayload))
        );
        debug("Aggregated package", {
            originalPayload,
            mappedPayload,
            existingPayload,
            payload,
        });

        const aggregatedRepository = await this.getAggregatedRepository(instance);
        const syncResult = await aggregatedRepository.save(payload, dataParams);
        const origin = await this.getOriginInstance();

        return [{ ...syncResult, origin: origin.toPublicObject(), payload }];
    }

    // Data elements are shared between the yearly and monthly WMR data sets. Without an explicit
    // data set, DHIS2 validates the periods against whichever of them it picks.
    private withTargetDataSet(payload: AggregatedPackage): AggregatedPackage {
        return this.targetDataSetId ? { ...payload, dataSet: this.targetDataSetId } : payload;
    }

    private overrideOrgUnitId(payload: AggregatedPackage): AggregatedPackage {
        const targetOrgUnit = this.orgUnitIdOverride;
        if (!targetOrgUnit) {
            return payload;
        } else {
            const { dataValues = [] } = payload;
            const updatedDataValues = dataValues.map(dataValue => ({
                ...dataValue,
                orgUnit: targetOrgUnit,
            }));
            return { ...payload, dataValues: updatedDataValues };
        }
    }

    private async manageDataElementWithFileType(
        payload: { dataValues: DataValue[] },
        remoteInstance: Instance
    ): Promise<{ dataValues: DataValue[] }> {
        const metadataRepository = await this.getMetadataRepository();
        const { dataElements = [] } = await metadataRepository.getMetadataByIds<DataElement>(
            payload.dataValues.map(dv => dv.dataElement).flat(),
            "id,valueType"
        );

        const dataElementFileTypes = dataElements.filter(de => de.valueType === "FILE_RESOURCE").map(de => de.id);

        const aggregatedRepository = await this.getAggregatedRepository();
        const fileRemoteRepository = await this.getInstanceFileRepository(remoteInstance);

        const dataValues = await promiseMap(payload.dataValues, async dataValue => {
            const isFileType = dataElementFileTypes.includes(dataValue.dataElement);

            if (isFileType) {
                const file = await aggregatedRepository.getDataValueFile(
                    dataValue.orgUnit,
                    dataValue.period,
                    dataValue.dataElement,
                    dataValue.categoryOptionCombo || "",
                    dataValue.value
                );

                const destinationFileId = await fileRemoteRepository.save(file, "DATA_VALUE");
                return { ...dataValue, value: destinationFileId };
            } else {
                return dataValue;
            }
        });

        return { dataValues };
    }

    public async buildDataStats() {
        const metadataPackage = await this.extractMetadata();
        const dictionary = buildMetadataDictionary(metadataPackage);
        const { dataValues } = await this.buildPayload();

        return _(dataValues)
            .groupBy("dataElement")
            .mapValues((array, dataElement) => ({
                dataElement: dictionary[dataElement]?.name ?? dataElement,
                count: array.length,
            }))
            .values()
            .value();
    }

    public async mapPayload(instance: Instance, payload: AggregatedPackage): Promise<AggregatedPackage> {
        // TODO: when we have mappers for all cases, this method should be removed in base class and use the mappers
        const metadataRepository = await this.getMetadataRepository();
        const remoteMetadataRepository = await this.getMetadataRepository(instance);
        const aggregatedRepository = await this.getAggregatedRepository();
        const mapping = await this.getMapping(instance);
        const { dataParams = {} } = this.builder;

        const eventMapper = await createAggregatedPayloadMapper(
            metadataRepository,
            remoteMetadataRepository,
            aggregatedRepository,
            mapping,
            dataParams
        );

        return (await eventMapper.map(payload)) as AggregatedPackage;
    }

    public filterPayload(payload: AggregatedPackage, filter: AggregatedPackage): AggregatedPackage {
        const dataValues = _.differenceBy(
            payload.dataValues ?? [],
            filter.dataValues ?? [],
            ({ dataElement, period, orgUnit, categoryOptionCombo, attributeOptionCombo, value }) =>
                [
                    dataElement,
                    period,
                    orgUnit,
                    categoryOptionCombo ?? "default",
                    attributeOptionCombo ?? "default",
                    value,
                ].join("-")
        );

        return { dataValues };
    }
}
