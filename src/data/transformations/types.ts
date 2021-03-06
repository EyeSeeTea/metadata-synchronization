import { MetadataEntities } from "../../domain/metadata/entities/MetadataEntities";

export type D2MetadataPackage = Partial<Record<keyof MetadataEntities, any[]>>;

export type D2AggregatedPackage = {
    dataValues: any[];
};

export type D2EventsPackage = {
    events: any[];
};
