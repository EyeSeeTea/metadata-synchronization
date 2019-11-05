import React, { useState, ReactNode } from "react";
import _ from "lodash";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";

import Toolbar from "@material-ui/core/Toolbar";
import Paper from "@material-ui/core/Paper";

import { DataTableHeader } from "./DataTableHeader";
import { ContextualMenu } from "./ContextualMenu";
import {
    TableObject,
    TablePagination,
    TableSorting,
    TableColumn,
    TableAction,
    TableNotification,
} from "./types";
import { DataTablePagination } from "./DataTablePagination";
import { DataTableBody } from "./DataTableBody";
import { sortObjects } from "./utils/sorting";
import { parseActions, getActionRows, getSelectionMessages } from "./utils/selection";

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            width: "100%",
        },
        toolbar: {
            paddingLeft: 0,
            paddingRight: 0,
        },
        paper: {
            flex: "1 1 0%",
            display: "flex",
        },
        tableWrapper: {
            display: "flex",
            flex: "1 1 0%",
            overflowX: "auto",
            paddingBottom: theme.spacing(2),
        },
        table: {
            width: "100%",
            minWidth: 750,
        },
        tablePagination: {
            flex: "1 1 auto",
        },
    })
);

export interface DataTableProps {
    rows: TableObject[];
    columns: TableColumn[];
    actions?: TableAction[];
    initialSorting?: TableSorting;
    sorting?: TableSorting; // Uncontrolled
    initialSelection?: string[];
    selection?: string[]; // Uncontrolled
    initialPagination?: TablePagination;
    pagination?: TablePagination; // Uncontrolled
    onChange?(selection: string[], sorting: TableSorting, pagination: TablePagination): void;
    idsForSelectInAllPages?: string[] | null; // Enables selection in all pages (force disabled with null)
    forceSelectionColumn?: boolean;
    tableNotifications?: TableNotification[];
    filterComponents?: ReactNode; // Portal to the navigation toolbar
    children?: ReactNode; // Portal to right-most of the Data Table
}

export default function DataTable(props: DataTableProps) {
    const classes = useStyles();
    const {
        rows,
        columns,
        actions: availableActions = [],
        initialSorting = { orderBy: columns[0].name, order: "asc" },
        sorting: uncontrolledSorting,
        initialSelection = [],
        selection: uncontrolledSelection,
        idsForSelectInAllPages = rows.map(row => row.id),
        initialPagination = { pageSize: 10, total: rows.length, page: 1, pageSizeOptions: [10] },
        pagination: uncontrolledPagination,
        forceSelectionColumn,
        tableNotifications = [],
        filterComponents,
        children,
    } = props;

    const [sorting, updateSorting] = useState(initialSorting as TableSorting);
    const [selection, updateSelection] = useState(initialSelection);
    const [pagination, updatePagination] = useState(initialPagination);

    const rowObjects = sortObjects(
        rows,
        uncontrolledPagination ? uncontrolledPagination : pagination,
        uncontrolledSorting ? uncontrolledSorting : sorting
    );

    const primaryAction = _(availableActions).find({ primary: true }) || availableActions[0];
    const allSelected = _.difference(rowObjects.map(row => row.id), selection).length === 0;
    const enableMultipleAction = _.isUndefined(forceSelectionColumn)
        ? !!_(availableActions).find({ multiple: true })
        : forceSelectionColumn;

    const selectionMessages = getSelectionMessages(
        rowObjects,
        uncontrolledSelection ? uncontrolledSelection : selection,
        uncontrolledPagination ? uncontrolledPagination : pagination,
        idsForSelectInAllPages || []
    );

    // Contextual menu
    const [contextMenuTarget, setContextMenuTarget] = useState<number[] | null>(null);
    const [contextMenuActions, setContextMenuActions] = useState<TableAction[]>([]);
    const [contextMenuRows, setContextMenuRows] = useState<TableObject[]>([]);

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        const ids = rowObjects.map(n => n.id);
        const newSelection = event.target.checked
            ? _.uniq(selection.concat(ids))
            : _.difference(selection, ids);
        handleSelectionChange(newSelection);
    };

    const handleCloseContextMenu = () => {
        setContextMenuTarget(null);
    };

    const handlePaginationChange = (newPagination: TablePagination) => {
        updatePagination(newPagination);
    };

    const handleSortingChange = (newSorting: TableSorting) => {
        updateSorting(newSorting);
    };

    const handleSelectionChange = (newSelection: string[]) => {
        updateSelection(newSelection);
    };

    const handleOpenContextualMenu = (
        row: TableObject,
        positionLeft: number,
        positionTop: number
    ) => {
        const actionRows = getActionRows(row, rows, selection);
        const actions = parseActions(actionRows, availableActions);
        if (actions.length > 0) {
            setContextMenuTarget([positionTop, positionLeft]);
            setContextMenuActions(actions);
            setContextMenuRows(actionRows);
        }
    };

    return (
        <div className={classes.root}>
            <Toolbar className={classes.toolbar}>
                {filterComponents}
                <div className={classes.tablePagination}>
                    <DataTablePagination
                        pagination={
                            uncontrolledPagination
                                ? uncontrolledPagination
                                : { ...pagination, total: rows.length }
                        }
                        onChange={handlePaginationChange}
                    />
                </div>
            </Toolbar>
            <div className={classes.tableWrapper}>
                <Paper className={classes.paper} square>
                    <Table
                        className={classes.table}
                        aria-labelledby="tableTitle"
                        size={"medium"}
                        aria-label="data table"
                    >
                        <DataTableHeader
                            columns={columns}
                            sorting={uncontrolledSorting ? uncontrolledSorting : sorting}
                            onChange={handleSortingChange}
                            onSelectAllClick={handleSelectAllClick}
                            allSelected={allSelected}
                            tableNotifications={[...tableNotifications, ...selectionMessages]}
                            handleSelectionChange={handleSelectionChange}
                            enableMultipleAction={enableMultipleAction}
                        />
                        <DataTableBody
                            rows={rowObjects}
                            columns={columns}
                            selected={uncontrolledSelection ? uncontrolledSelection : selection}
                            onChange={handleSelectionChange}
                            openContextualMenu={handleOpenContextualMenu}
                            primaryAction={primaryAction}
                            enableMultipleAction={enableMultipleAction}
                        />
                    </Table>
                </Paper>
                {children}
            </div>
            {contextMenuTarget && (
                <ContextualMenu
                    isOpen={!!contextMenuTarget}
                    rows={contextMenuRows}
                    actions={contextMenuActions}
                    positionLeft={contextMenuTarget[0]}
                    positionTop={contextMenuTarget[1]}
                    onClose={handleCloseContextMenu}
                />
            )}
        </div>
    );
}
