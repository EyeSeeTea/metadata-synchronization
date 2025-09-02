import { Id } from "../../common/entities/Schemas";
import { Visualization } from "../entities/Visualization";

export type GetVisualizationsOptions = {
    onlyRows?: boolean;
};

export interface VisualizationsRepository {
    getByIds(ids: Id[], options: GetVisualizationsOptions): Promise<Visualization[]>;
}
