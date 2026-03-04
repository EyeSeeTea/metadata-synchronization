import _ from "lodash";
import { MetadataPackage } from "../../domain/metadata/entities/MetadataEntities";
import { Transformation } from "../../domain/transformations/entities/Transformation";
import { TransformationRepository } from "../../domain/transformations/repositories/TransformationRepository";
import { API_VERSION } from "../../types/d2-api";

export class TransformationD2ApiRepository implements TransformationRepository {
    /**
     * Apply consecutive transformations to domain package until bigger version transformation found for dhis2 version
     * if exists transformations for versions 30,31,33 and version argument is 31 then
     * transformations 30 and 31 will be applied
     * @param version version until apply transformations
     * @param payload  payload to transform
     * @param transformations list of possible transformations to apply
     */
    public mapPackageTo(
        destination: number,
        payload: MetadataPackage,
        transformations: Transformation[] = [],
        origin?: number
    ): MetadataPackage {
        const transformationstoApply = _.orderBy(transformations, ["apiVersion"]).filter(
            ({ apiVersion }) => apiVersion <= destination && apiVersion > (origin || API_VERSION)
        );

        if (transformationstoApply.length > 0) {
            return this.applyTransformations(payload, transformationstoApply);
        } else {
            return payload;
        }
    }

    /**
     * Apply consecutive transformations to dhis2 package until lower version transformation found for dhis2 version that
     * transform to domain metadata package
     * if exists transformations for versions 30,31,33 and version argument is 31 then
     * transformations 30 and 31 will be applied
     * @param version version until apply transformations
     * @param payload  payload to transform
     * @param transformations list of possible transformations to apply
     */
    public mapPackageFrom(
        origin: number,
        payload: MetadataPackage,
        transformations: Transformation[] = [],
        destination?: number
    ): MetadataPackage {
        const transformationstoApply = _.orderBy(transformations, ["apiVersion"], ["desc"]).filter(
            ({ apiVersion }) => apiVersion <= origin && apiVersion > (destination || API_VERSION)
        );

        if (transformationstoApply.length > 0) {
            return this.cleanTransformationObject(this.undoTransformations(payload, transformationstoApply));
        } else {
            return payload;
        }
    }

    private applyTransformations(payload: MetadataPackage, transformations: Transformation[]): MetadataPackage {
        return transformations.reduce(
            (transformedPayload: MetadataPackage, transformation: Transformation) =>
                transformation.apply
                    ? transformation.apply<MetadataPackage, MetadataPackage>(transformedPayload)
                    : transformedPayload,
            payload
        );
    }

    private undoTransformations(payload: MetadataPackage, transformations: Transformation[]): MetadataPackage {
        return transformations.reduce(
            (transformedPayload: MetadataPackage, transformation: Transformation) =>
                transformation.undo
                    ? transformation.undo<MetadataPackage, MetadataPackage>(transformedPayload)
                    : transformedPayload,
            payload
        );
    }

    private cleanTransformationObject(payload: MetadataPackage): MetadataPackage {
        return _.transform(
            payload as Record<string, unknown>,
            (result, value, key) => {
                if (!!value && Array.isArray(value) && _.compact(value).length > 0) {
                    result[key] = value;
                } else if (!!value && !Array.isArray(value)) {
                    result[key] = value;
                }
            },
            {} as Record<string, unknown>
        ) as MetadataPackage;
    }
}
