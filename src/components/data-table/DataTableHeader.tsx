import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import TableSortLabel from "@material-ui/core/TableSortLabel";
import Checkbox from "@material-ui/core/Checkbox";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ViewColumnIcon from "@material-ui/icons/ViewColumn";

import { TableSorting, TableColumn, TableNotification } from "./types";
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

export interface DataTableHeaderProps {
    columns: TableColumn[];
    sorting: TableSorting;
    onChange?(newSorting: TableSorting): void;
    allSelected?: boolean;
    tableNotifications?: TableNotification[];
    handleSelectionChange?(newSelection: string[]): void;
    onSelectAllClick?: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
    enableMultipleAction?: boolean;
}

export function DataTableHeader(props: DataTableHeaderProps) {
    const classes = useStyles();
    const {
        onSelectAllClick,
        sorting,
        allSelected = false,
        columns,
        onChange = () => {},
        tableNotifications = [],
        handleSelectionChange,
        enableMultipleAction,
    } = props;

    const { orderBy, order } = sorting;

    const createSortHandler = (property: string) => (_event: React.MouseEvent<unknown>) => {
        const isDesc = orderBy === property && order === "desc";
        onChange({ orderBy: property, order: isDesc ? "asc" : "desc" });
    };

    return (
        <TableHead>
            <TableRow>
                {enableMultipleAction && (
                    <TableCell className={classes.cell} padding="checkbox">
                        <Checkbox
                            checked={allSelected}
                            onChange={onSelectAllClick}
                            inputProps={{ "aria-label": "select all items" }}
                        />
                    </TableCell>
                )}
                {columns.map(column => (
                    <TableCell
                        className={classes.cell}
                        key={column.name}
                        align="left"
                        padding={enableMultipleAction ? "none" : undefined}
                        sortDirection={orderBy === column.name ? order : false}
                    >
                        <TableSortLabel
                            active={orderBy === column.name}
                            direction={order}
                            onClick={createSortHandler(column.name)}
                            IconComponent={ExpandMoreIcon}
                        >
                            {column.text}
                            {orderBy === column.name ? (
                                <span className={classes.visuallyHidden}>
                                    {order === "desc" ? "sorted descending" : "sorted ascending"}
                                </span>
                            ) : null}
                        </TableSortLabel>
                    </TableCell>
                ))}
                <TableCell className={classes.cell} padding="none" align={"center"}>
                    <IconButton>
                        <ViewColumnIcon />
                    </IconButton>
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
