import { ReactNode } from "react";

export interface TableObject {
    id: string;
    [key: string]: any;
}

export interface TableColumn<T extends TableObject> {
    name: keyof T;
    text: string;
    sortable?: boolean;
    getValue?(row: TableObject, defaultValue: ReactNode): ReactNode;
}

export interface TableAction {
    name: string;
    text: string;
    icon?: ReactNode;
    multiple?: boolean;
    primary?: boolean;
    onClick?(rows: TableObject[]): void;
    isActive?(rows: TableObject[]): boolean;
}

export interface TableSorting<T extends TableObject> {
    orderBy: keyof T;
    order: "asc" | "desc";
}

export interface TablePagination {
    pageSizeOptions?: number[];
    pageSize: number;
    total: number;
    page: number;
}

type Optional<T, K> = { [P in Extract<keyof T, K>]?: T[P] };

export interface TableState<T extends TableObject> {
    selection: string[];
    sorting: TableSorting<T>;
    pagination: TablePagination;
}

export type TableInitialState<T extends TableObject> = Optional<
    TableState<T>,
    "sorting" | "selection" | "pagination"
>;

export interface TableNotification {
    // These props should be refactored and included everything into (...args) => ReactNode
    message: ReactNode;
    link?: string;
    newSelection?: string[];
}

export type ObjectsTableDetailField<T extends TableObject> = Omit<TableColumn<T>, "sortable">;
