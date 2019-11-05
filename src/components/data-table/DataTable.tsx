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
    TableInitialState,
    TableState,
    ReferenceObject,
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

export interface DataTableProps<T extends ReferenceObject> {
    rows: T[];
    columns: TableColumn<T>[];
    actions?: TableAction<T>[];
    initialState?: TableInitialState<T>;
    forceSelectionColumn?: boolean;
    tableNotifications?: TableNotification[];
    filterComponents?: ReactNode; // Portal to the navigation toolbar
    sideComponents?: ReactNode; // Portal to right-most of the Data Table
    ids?: string[]; // Enables selection in all pages (disabled with [])
    // State controlled by parent
    sorting?: TableSorting<T>;
    selection?: string[];
    pagination?: TablePagination;
    onChange?(state: TableState<T>): void;
}

export default function DataTable<T extends ReferenceObject = TableObject>(
    props: DataTableProps<T>
) {
    const classes = useStyles();
    const {
        rows,
        columns,
        actions: availableActions = [],
        initialState = {},
        forceSelectionColumn,
        tableNotifications = [],
        filterComponents,
        sideComponents,
        ids = rows.map(row => row.id),
        sorting: controlledSorting,
        selection: controlledSelection,
        pagination: controlledPagination,
        onChange = _.noop,
    } = props;

    const initialSorting = initialState.sorting || {
        orderBy: columns[0].name,
        order: "asc" as const,
    };
    const initialSelection = initialState.selection || [];
    const initialPagination = initialState.pagination || {
        pageSize: 10,
        total: rows.length,
        page: 1,
        pageSizeOptions: [10],
    };

    const [stateSorting, updateSorting] = useState(initialSorting);
    const [stateSelection, updateSelection] = useState(initialSelection);
    const [statePagination, updatePagination] = useState(initialPagination);

    const sorting = controlledSorting || stateSorting;
    const selection = controlledSelection || stateSelection;
    const pagination = controlledPagination || statePagination;

    const rowObjects = sortObjects(rows, pagination, sorting);
    const primaryAction = _(availableActions).find({ primary: true }) || availableActions[0];
    const allSelected =
        rowObjects.length > 0 &&
        _.difference(rowObjects.map(row => row.id), selection).length === 0;
    const enableMultipleAction = _.isUndefined(forceSelectionColumn)
        ? _.some(availableActions, "multiple")
        : forceSelectionColumn;

    const selectionMessages = getSelectionMessages(rowObjects, selection, pagination, ids);

    // Contextual menu
    const [contextMenuTarget, setContextMenuTarget] = useState<number[] | null>(null);
    const [contextMenuActions, setContextMenuActions] = useState<TableAction<T>[]>([]);
    const [contextMenuRows, setContextMenuRows] = useState<T[]>([]);

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

    const handlePaginationChange = (pagination: TablePagination) => {
        updatePagination(pagination);
        onChange({ selection, pagination, sorting });
    };

    const handleSortingChange = (sorting: TableSorting<T>) => {
        updateSorting(sorting);
        onChange({ selection, pagination, sorting });
    };

    const handleSelectionChange = (selection: string[]) => {
        updateSelection(selection);
        onChange({ selection, pagination, sorting });
    };

    const handleOpenContextualMenu = (row: T, positionLeft: number, positionTop: number) => {
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
                        pagination={{ ...pagination, total: rows.length }} // TODO: Verify this
                        onChange={handlePaginationChange}
                    />
                </div>
            </Toolbar>
            <div className={classes.tableWrapper}>
                <Paper className={classes.paper} square>
                    <Table className={classes.table} size={"medium"}>
                        <DataTableHeader
                            columns={columns}
                            sorting={sorting}
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
                            selected={selection}
                            onChange={handleSelectionChange}
                            openContextualMenu={handleOpenContextualMenu}
                            primaryAction={primaryAction}
                            enableMultipleAction={enableMultipleAction}
                        />
                    </Table>
                </Paper>
                {sideComponents}
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
