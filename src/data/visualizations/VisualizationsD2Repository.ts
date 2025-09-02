import { Future } from "../../domain/common/entities/Future";
import { Id } from "../../domain/common/entities/Schemas";
import { Instance } from "../../domain/instance/entities/Instance";
import { Visualization } from "../../domain/visualizations/entities/Visualization";
import {
    GetVisualizationsOptions,
    VisualizationsRepository,
} from "../../domain/visualizations/repositories/VisualizationsRepository";
import { D2Api } from "../../types/d2-api";
import { getD2APiFromInstance } from "../../utils/d2-utils";
import { apiToFuture } from "../common/utils/api-futures";

export class VisualizationsD2Repository implements VisualizationsRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    async getByIds(ids: Id[], options: GetVisualizationsOptions): Promise<Visualization[]> {
        const fields = options.onlyRows ? "id,rows[dimension,items[id,name]]" : "*";

        const $reqVisualizations = ids.map(id => {
            return apiToFuture(
                this.api.get<Visualization>(`/visualizations/${id}`, {
                    fields: fields,
                })
            );
        });

        return Future.parallel([...$reqVisualizations], {
            concurrency: 5,
        })
            .map(visualizationsResponse => visualizationsResponse)
            .toPromise();
    }
}
