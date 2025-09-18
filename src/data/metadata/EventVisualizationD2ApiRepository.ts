import { Instance } from "../../domain/instance/entities/Instance";
import { D2Api, Id } from "../../types/d2-api";

import { EventVisualization } from "../../domain/metadata/entities/MetadataEntities";
import { EventVisualizationRepository } from "../../domain/metadata/repositories/EventVisualizationRepository";
import { getD2APiFromInstance } from "../../utils/d2-utils";
import _ from "lodash";

export class EventVisualizationD2ApiRepository implements EventVisualizationRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    async getByIds(ids: Id[]): Promise<EventVisualization[]> {
        const uniqueIds = _(ids).uniq().value();
        if (uniqueIds.length === 0) return [];

        const { eventVisualizations } = await this.api
            .get<{ eventVisualizations: EventVisualization[] }>("/eventVisualizations", {
                fields: ":all",
                filter: `id:in:[${uniqueIds.join(",")}]`,
            })
            .getData();

        return eventVisualizations;
    }
}
