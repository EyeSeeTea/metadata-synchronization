import { Transformation } from "../entities/Transformation";
import { MetadataPackage } from "../../metadata/entities/MetadataEntities";

export interface TransformationRepository {
    mapPackageTo(
        destination: number,
        payload: MetadataPackage,
        transformations: Transformation[],
        origin?: number
    ): MetadataPackage;

    mapPackageFrom(
        origin: number,
        payload: MetadataPackage,
        transformations: Transformation[],
        destination?: number
    ): MetadataPackage;
}
