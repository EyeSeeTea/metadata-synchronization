import React from "react";
import _ from "lodash";
import Pagination from "@material-ui/core/TablePagination";

import { TablePagination } from "./types";

export interface DataTablePaginationProps {
    pagination: TablePagination;
    onChange?(newPagination: TablePagination): void;
}

export function DataTablePagination(props: DataTablePaginationProps) {
    const { pagination, onChange = _.noop } = props;

    const handleChangePage = (_event: unknown, page: number) => {
        onChange({
            ...pagination,
            page: page + 1,
        });
    };

    const handleChangePageSize = (event: React.ChangeEvent<HTMLInputElement>) => {
        const pageSize = parseInt(event.target.value, 10);
        onChange({
            ...pagination,
            pageSize,
            page: 1,
        });
    };

    const currentPage = pagination.total > 0 ? pagination.page - 1 : 0;

    return (
        <Pagination
            rowsPerPageOptions={pagination.pageSizeOptions}
            component="div"
            count={pagination.total}
            rowsPerPage={pagination.pageSize}
            page={currentPage}
            onChangePage={handleChangePage}
            onChangeRowsPerPage={handleChangePageSize}
        />
    );
}
