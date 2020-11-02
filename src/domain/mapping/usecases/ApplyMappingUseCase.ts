import _ from "lodash";
import { cleanNestedMappedId } from "../../../presentation/react/components/mapping-table/utils";
import { UseCase } from "../../common/entities/UseCase";
import { DataSource } from "../../instance/entities/DataSource";
import { cleanOrgUnitPaths } from "../../synchronization/utils";
import { MappingConfig } from "../entities/MappingConfig";
import { MetadataMappingDictionary } from "../entities/MetadataMapping";
import { GenericMappingUseCase } from "./GenericMappingUseCase";

export class ApplyMappingUseCase extends GenericMappingUseCase implements UseCase {
    public async execute(
        originInstance: DataSource,
        destinationInstance: DataSource,
        mapping: MetadataMappingDictionary,
        updates: MappingConfig[],
        isChildrenMapping: boolean
    ): Promise<MetadataMappingDictionary> {
        try {
            const ids = _.flatMap(updates, ({ selection }) =>
                cleanOrgUnitPaths(selection).map(id => cleanNestedMappedId(id))
            );

            const metadataResponse = await this.getMetadata(originInstance, ids);
            const metadata = this.createMetadataDictionary(metadataResponse);

            const newMapping = _.cloneDeep(mapping);

            for (const {
                selection,
                mappingType,
                mappedId,
                global = false,
                overrides = {},
            } of updates) {
                for (const id of selection) {
                    _.unset(newMapping, [mappingType, id]);
                    if (isChildrenMapping || mappedId) {
                        const mapping = await this.buildMapping({
                            metadata,
                            originInstance,
                            destinationInstance,
                            originalId: _.last(id.split("-")) ?? id,
                            mappedId,
                        });

                        _.set(newMapping, [mappingType, id], {
                            ...mapping,
                            global,
                            ...overrides,
                        });
                    }
                }
            }

            return newMapping;
        } catch (e) {
            console.error(e);
            return {};
        }
    }
}