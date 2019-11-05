import _ from "lodash";

import { TableObject, TablePagination, TableSorting } from "../types";

export function sortObjects<T extends TableObject>(
    rows: T[],
    tablePagination: TablePagination,
    tableSorting: TableSorting<T>
) {
    const { orderBy, order } = tableSorting;
    const { page, pageSize } = tablePagination;
    const realPage = page - 1;

    return _(rows)
        .orderBy([orderBy], [order])
        .slice(realPage * pageSize, realPage * pageSize + pageSize)
        .value();
}
