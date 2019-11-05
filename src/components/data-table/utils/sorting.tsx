import { TableObject, Order, TablePagination, TableSorting } from "../types";

function desc<T>(a: T, b: T, orderBy: keyof T) {
    if (b[orderBy] < a[orderBy]) {
        return -1;
    }
    if (b[orderBy] > a[orderBy]) {
        return 1;
    }
    return 0;
}

function sort(array: TableObject[], cmp: (a: TableObject, b: TableObject) => number) {
    const collection = array.map((el, index) => [el, index] as [TableObject, number]);
    collection.sort((a, b) => {
        const order = cmp(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return collection.map(el => el[0]);
}

function getSorting<K extends keyof any>(
    order: Order,
    orderBy: K
): (a: { [key in K]: number | string }, b: { [key in K]: number | string }) => number {
    return order === "desc" ? (a, b) => desc(a, b, orderBy) : (a, b) => -desc(a, b, orderBy);
}

export function sortObjects(
    rows: TableObject[],
    tablePagination: TablePagination,
    tableSorting: TableSorting
) {
    const { orderBy, order } = tableSorting;
    const { page, pageSize } = tablePagination;
    const realPage = page - 1;

    return sort(rows, getSorting(order, orderBy)).slice(
        realPage * pageSize,
        realPage * pageSize + pageSize
    );
}
