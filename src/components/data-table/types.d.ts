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
    getValue?: Function;
    contents?: HTMLElement | null;
}

export interface TableAction {
    name: string;
    text: string;
    icon?: ReactNode;
    multiple?: boolean;
    isPrimary?: boolean;
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
