import _ from "lodash";
import memoize from "nano-memoize";
import { modelFactory } from "../../../models/dhis/factory";
import { ExportBuilder, NestedRules } from "../../../types/synchronization";
import { promiseMap } from "../../../utils/common";
import { debug } from "../../../utils/debug";
import { Ref } from "../../common/entities/Ref";
import { Instance } from "../../instance/entities/Instance";
import { MappingMapper } from "../../mapping/helpers/MappingMapper";
import { SynchronizationResult } from "../../synchronization/entities/SynchronizationResult";
import { GenericSyncUseCase } from "../../synchronization/usecases/GenericSyncUseCase";
import { MetadataEntities, MetadataPackage } from "../entities/MetadataEntities";
import { buildNestedRules, cleanObject, cleanReferences, getAllReferences } from "../utils";

export class MetadataSyncUseCase extends GenericSyncUseCase {
    public readonly type = "metadata";

    public async exportMetadata(originalBuilder: ExportBuilder): Promise<MetadataPackage> {
        const visitedIds: Set<string> = new Set();
        const recursiveExport = async (builder: ExportBuilder): Promise<MetadataPackage> => {
            const {
                type,
                ids,
                excludeRules,
                includeRules,
                includeSharingSettings,
                removeOrgUnitReferences,
            } = builder;

            //TODO: when metadata entities schema exists on domain, move this factory to domain
            const collectionName = modelFactory(type).getCollectionName();
            const schema = this.api.models[collectionName].schema;
            const result: MetadataPackage = {};

            // Each level of recursion traverse the exclude/include rules with nested values
            const nestedExcludeRules: NestedRules = buildNestedRules(excludeRules);
            const nestedIncludeRules: NestedRules = buildNestedRules(includeRules);

            // Get all the required metadata
            const metadataRepository = await this.getMetadataRepository();
            const syncMetadata = await metadataRepository.getMetadataByIds(ids);
            const elements = syncMetadata[collectionName] || [];

            for (const element of elements) {
                // Store metadata object in result
                const object = cleanObject(
                    this.api,
                    schema.name,
                    element,
                    excludeRules,
                    includeSharingSettings,
                    removeOrgUnitReferences
                );

                result[collectionName] = result[collectionName] || [];
                result[collectionName]?.push(object);

                // Get all the referenced metadata
                const references = getAllReferences(this.api, object, schema.name);
                const includedReferences = cleanReferences(references, includeRules);
                const promises = includedReferences
                    .map(type => ({
                        type: type as keyof MetadataEntities,
                        ids: references[type].filter(id => !visitedIds.has(id)),
                        excludeRules: nestedExcludeRules[type],
                        includeRules: nestedIncludeRules[type],
                        includeSharingSettings,
                        removeOrgUnitReferences,
                    }))
                    .map(newBuilder => {
                        newBuilder.ids.forEach(id => {
                            visitedIds.add(id);
                        });
                        return recursiveExport(newBuilder);
                    });
                const promisesResult: MetadataPackage[] = await Promise.all(promises);
                _.deepMerge(result, ...promisesResult);
            }

            // Clean up result from duplicated elements
            return _.mapValues(result, objects => _.uniqBy(objects, "id"));
        };
        return recursiveExport(originalBuilder);
    }

    public buildPayload = memoize(async () => {
        const { metadataIds, syncParams, filterRules = [] } = this.builder;
        const {
            includeSharingSettings = true,
            removeOrgUnitReferences = false,
            metadataIncludeExcludeRules = {},
            useDefaultIncludeExclude = {},
        } = syncParams ?? {};

        const metadataRepository = await this.getMetadataRepository();
        const filterRulesIds = await metadataRepository.getByFilterRules(filterRules);
        const allMetadataIds = _.union(metadataIds, filterRulesIds);
        const metadata = await metadataRepository.getMetadataByIds<Ref>(allMetadataIds, "id");

        const exportResults = await promiseMap(_.keys(metadata), type => {
            const myClass = modelFactory(type);
            const metadataType = myClass.getMetadataType();
            const collectionName = myClass.getCollectionName();

            return this.exportMetadata({
                type: collectionName,
                ids: metadata[collectionName]?.map(e => e.id) || [],
                excludeRules: useDefaultIncludeExclude
                    ? myClass.getExcludeRules()
                    : metadataIncludeExcludeRules[metadataType].excludeRules.map(_.toPath),
                includeRules: useDefaultIncludeExclude
                    ? myClass.getIncludeRules()
                    : metadataIncludeExcludeRules[metadataType].includeRules.map(_.toPath),
                includeSharingSettings,
                removeOrgUnitReferences,
            });
        });

        const metadataPackage: MetadataPackage = _.deepMerge({}, ...exportResults);
        const metadataWithoutDuplicates: MetadataPackage = _.mapValues(metadataPackage, elements =>
            _.uniqBy(elements, "id")
        );

        debug("Metadata package", metadataWithoutDuplicates);
        return metadataWithoutDuplicates;
    });

    public async postPayload(instance: Instance): Promise<SynchronizationResult[]> {
        const { syncParams } = this.builder;

        const payloadPackage = await this.buildPayload();
        const mappedPayloadPackage = syncParams?.enableMapping
            ? await this.mapPayload(instance, payloadPackage)
            : payloadPackage;

        debug("Metadata package", { payloadPackage, mappedPayloadPackage });

        const remoteMetadataRepository = await this.getMetadataRepository(instance);
        const syncResult = await remoteMetadataRepository.save(mappedPayloadPackage, syncParams);
        const origin = await this.getOriginInstance();

        return [{ ...syncResult, origin: origin.toPublicObject() }];
    }

    public async buildDataStats() {
        return undefined;
    }

    public async mapPayload(
        instance: Instance,
        payload: MetadataPackage
    ): Promise<MetadataPackage> {
        const instanceRepository = await this.getInstanceRepository();
        const remoteInstanceRepository = await this.getInstanceRepository(instance);

        const originCategoryOptionCombos = await instanceRepository.getCategoryOptionCombos();
        const destinationCategoryOptionCombos = await remoteInstanceRepository.getCategoryOptionCombos();
        const mapping = await this.getMapping(instance);

        const mapper = new MappingMapper(
            mapping,
            originCategoryOptionCombos,
            destinationCategoryOptionCombos
        );
        return mapper.applyMapping(payload);
    }
}
