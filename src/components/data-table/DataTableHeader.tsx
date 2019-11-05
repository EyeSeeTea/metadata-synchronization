import React from "react";
import _ from "lodash";
import { makeStyles } from "@material-ui/core/styles";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import TableSortLabel from "@material-ui/core/TableSortLabel";
import Checkbox from "@material-ui/core/Checkbox";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ViewColumnIcon from "@material-ui/icons/ViewColumn";

import { TableSorting, TableColumn, TableNotification, ReferenceObject } from "./types";
import IconButton from "@material-ui/core/IconButton";
import { DataTableNotifications } from "./DataTableNotifications";

const useStyles = makeStyles({
    visuallyHidden: {
        border: 0,
        clip: "rect(0 0 0 0)",
        height: 1,
        margin: -1,
        overflow: "hidden",
        padding: 0,
        position: "absolute",
        top: 20,
        width: 1,
    },
    cell: {
        borderBottom: "3px solid #E0E0E0",
        minHeight: "55px",
    },
});

export interface DataTableHeaderProps<T extends ReferenceObject> {
    columns: TableColumn<T>[];
    sorting: TableSorting<T>;
    onChange?(newSorting: TableSorting<T>): void;
    allSelected?: boolean;
    tableNotifications?: TableNotification[];
    handleSelectionChange?(newSelection: string[]): void;
    onSelectAllClick?: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
    enableMultipleAction?: boolean;
}

export function DataTableHeader<T extends ReferenceObject>(props: DataTableHeaderProps<T>) {
    const classes = useStyles();
    const {
        onSelectAllClick,
        sorting,
        allSelected = false,
        columns,
        onChange = _.noop,
        tableNotifications = [],
        handleSelectionChange,
        enableMultipleAction,
    } = props;

    const { orderBy, order } = sorting;

    const createSortHandler = (property: keyof T) => (_event: React.MouseEvent<unknown>) => {
        const isDesc = orderBy === property && order === "desc";
        onChange({ orderBy: property, order: isDesc ? "asc" : "desc" });
    };

    return (
        <TableHead>
            <TableRow>
                {enableMultipleAction && (
                    <TableCell className={classes.cell} padding="checkbox">
                        <Checkbox checked={allSelected} onChange={onSelectAllClick} />
                    </TableCell>
                )}
                {columns.map(column => (
                    <TableCell
                        className={classes.cell}
                        key={`data-table-cell-${column.name}`}
                        align="left"
                        padding={enableMultipleAction ? "none" : undefined}
                        sortDirection={orderBy === column.name ? order : false}
                    >
                        <TableSortLabel
                            active={orderBy === column.name}
                            direction={order}
                            onClick={createSortHandler(column.name)}
                            IconComponent={ExpandMoreIcon}
                            disabled={column.sortable === false}
                        >
                            {column.text}
                        </TableSortLabel>
                    </TableCell>
                ))}
                <TableCell className={classes.cell} padding="none" align={"center"}>
                    <IconButton>{false && <ViewColumnIcon />}</IconButton>
                </TableCell>
            </TableRow>
            {tableNotifications.length > 0 && (
                <TableRow>
                    <TableCell padding="none" colSpan={columns.length + 2}>
                        <DataTableNotifications
                            messages={tableNotifications}
                            updateSelection={handleSelectionChange}
                        />
                    </TableCell>
                </TableRow>
            )}
        </TableHead>
    );
}
