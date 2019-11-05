import _ from "lodash";
import { TableObject } from "../types";

export function filterObjects<T extends TableObject>(
    objects: T[],
    searchColumns: (keyof T)[],
    searchValue: string
) {
    return _.filter(objects, o =>
        _(o)
            .keys()
            .filter(k => searchColumns.includes(k))
            .some(k => String(o[k]).toLowerCase().includes(searchValue.toLowerCase()))
    );
}
