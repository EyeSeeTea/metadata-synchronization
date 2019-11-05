import _ from "lodash";
import { TableObject } from "../types";

export function filterObjects<T extends TableObject>(objects: T[], search: string) {
    return _.filter(objects, o =>
        _(o)
            .keys()
            .filter(k => typeof o[k] === "string")
            .some(k => o[k].toLowerCase().includes(search.toLowerCase()))
    );
}
