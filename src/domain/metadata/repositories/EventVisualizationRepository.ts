import { Id } from "../../common/entities/Schemas";
import { EventVisualization } from "../entities/MetadataEntities";

export interface EventVisualizationRepository {
    getByIds(ids: Id[]): Promise<EventVisualization[]>;
}
