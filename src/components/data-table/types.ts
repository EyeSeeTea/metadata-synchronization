import { ReactNode } from "react";

export type ReferenceObject = { id: string };

export interface TableObject extends ReferenceObject {
    [key: string]: any;
}

export interface TableColumn<T extends ReferenceObject> {
    name: keyof T;
    text: string;
    sortable?: boolean;
    getValue?(row: T, defaultValue: ReactNode): ReactNode;
}

export interface TableAction<T extends ReferenceObject> {
    name: string;
    text: string;
    icon?: ReactNode;
    multiple?: boolean;
    primary?: boolean;
    onClick?(rows: T[]): void;
    isActive?(rows: T[]): boolean;
}

export interface TableSorting<T extends ReferenceObject> {
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

export interface TableState<T extends ReferenceObject> {
    selection: string[];
    sorting: TableSorting<T>;
    pagination: TablePagination;
}

export type TableInitialState<T extends ReferenceObject> = Optional<
    TableState<T>,
    "sorting" | "selection" | "pagination"
>;

export interface TableNotification {
    // These props should be refactored and included everything into (...args) => ReactNode
    message: ReactNode;
    link?: string;
    newSelection?: string[];
}

export type ObjectsTableDetailField<T extends ReferenceObject> = Omit<TableColumn<T>, "sortable">;
