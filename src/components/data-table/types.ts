import { ReactNode } from "react";

export type Order = "asc" | "desc";

export interface TableObject {
    id: string;
    [key: string]: any;
}

export interface TableColumn {
    name: string;
    text: string;
    sortable: boolean;
    getValue?(row: TableObject, defaultValue: ReactNode): ReactNode;
}

export interface TableAction {
    name: string;
    text: string;
    icon?: ReactNode;
    multiple?: boolean;
    primary?: boolean;
    onClick?(rows: TableObject[]): void;
    isActive?: Function;
}

export interface TableSorting {
    orderBy: string;
    order: "asc" | "desc";
}

export interface TablePagination {
    pageSizeOptions?: number[];
    pageSize: number;
    total: number;
    page: number;
}

export type TableSelectionKind = "all" | "hidden" | "none";

export interface TableNotification {
    message: ReactNode;
    link?: string; // TODO: This shall be renamed as actionLabel or something similar
    newSelection?: string[]; // TODO: This shall be refactored to be a generic onClick
}

export type ObjectsTableDetailField = Omit<TableColumn, "sortable">;
