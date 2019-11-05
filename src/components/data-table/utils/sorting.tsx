import _ from "lodash";

import { ReferenceObject, TablePagination, TableSorting } from "../types";

export function sortObjects<T extends ReferenceObject>(
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
