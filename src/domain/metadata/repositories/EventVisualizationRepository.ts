import { Id } from "../../common/entities/Schemas";
import { Instance } from "../../instance/entities/Instance";
import { EventVisualization } from "../entities/MetadataEntities";

export interface EventVisualizationRepositoryConstructor {
    new (instance: Instance): EventVisualizationRepository;
}

export interface EventVisualizationRepository {
    getByIds(ids: Id[]): Promise<EventVisualization[]>;
}
