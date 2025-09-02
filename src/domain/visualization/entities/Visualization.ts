import { Id } from "../../common/entities/Schemas";

type VisualizationRowItem = {
    id: string;
    name: string;
};

type VisualizationRow = {
    id: string;
    dimension: string;
    items: VisualizationRowItem[];
};

export type Visualization = {
    id: Id;
    rows: VisualizationRow[];
};
