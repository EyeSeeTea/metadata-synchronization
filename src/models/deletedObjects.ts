import _ from "lodash";
import axios from "axios";
import moment, { Moment } from "moment";

import { D2 } from "../types/d2";
import { TableList, TablePagination, TableFilters } from "../types/d2-ui-components";
import { getBaseUrl } from "../utils/d2";

type DeletedObjectData = {
    uid: string;
    code: string;
    klass: string;
    deletedAt: Date;
    deletedBy: string;
};

interface DeletedObjectsTableFilters extends TableFilters {
    deletedAtFilter: Moment;
    metadataTypeFilter: string;
}

export default class DeletedObject {
    private data: DeletedObjectData;

    constructor(data: DeletedObjectData) {
        this.data = data;
    }

    public get code(): string {
        return this.data.code;
    }

    public get klass(): string {
        return this.data.klass;
    }

    public get deletedAt(): Date {
        return this.data.deletedAt;
    }

    public get deletedBy(): string {
        return this.data.deletedBy;
    }

    public static build(data: DeletedObjectData | undefined): DeletedObject {
        return new DeletedObject(
            data || {
                uid: "",
                code: "",
                klass: "",
                deletedAt: new Date(),
                deletedBy: "",
            }
        );
    }

    public static async list(
        d2: D2,
        filters: DeletedObjectsTableFilters,
        pagination: TablePagination
    ): Promise<TableList> {
        const { search = null, deletedAtFilter = null, metadataTypeFilter = null } = filters || {};
        const { page = 1, pageSize = 20, paging = true, sorting = ["id", "asc"] } =
            pagination || {};

        const { deletedObjects: rawData } = (await axios.get(getBaseUrl(d2) + "/deletedObjects", {
            withCredentials: true,
            params: {
                fields: ":all,uid~rename(id)",
                paging: false,
            },
        })).data;

        const filteredData = _(rawData)
            .filter(object =>
                search
                    ? _(object)
                          .keys()
                          .filter(k => typeof object[k] === "string")
                          .some(k => object[k].toLowerCase().includes(search.toLowerCase()))
                    : true
            )
            .filter(object =>
                deletedAtFilter && object.deletedAt
                    ? moment(deletedAtFilter).isSameOrBefore(object.deletedAt)
                    : true
            )
            .filter(object => (metadataTypeFilter ? object.klass === metadataTypeFilter : true))
            .value();

        const [field, direction] = sorting;
        const sortedData = _.orderBy(
            filteredData,
            [data => (data[field] ? data[field].toLowerCase() : "")],
            [direction as "asc" | "desc"]
        );

        const total = sortedData.length;
        const pageCount = paging ? Math.ceil(sortedData.length / pageSize) : 1;
        const firstItem = paging ? (page - 1) * pageSize : 0;
        const lastItem = paging ? firstItem + pageSize : sortedData.length;
        const paginatedData = _.slice(sortedData, firstItem, lastItem);

        return { objects: paginatedData, pager: { page, pageCount, total } };
    }
}
