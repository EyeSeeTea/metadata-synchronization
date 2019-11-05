import React, { MouseEvent } from "react";
import { makeStyles } from "@material-ui/core/styles";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import Checkbox from "@material-ui/core/Checkbox";
import IconButton from "@material-ui/core/IconButton";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import Tooltip from "@material-ui/core/Tooltip";
import i18n from "@dhis2/d2-i18n";

import { isEventCtrlClick, updateSelection } from "./utils/selection";
import { formatRowValue } from "./utils/formatting";
import { TableObject, TableColumn, TableAction } from "./types";

const useStyles = makeStyles({
    cell: {
        borderBottom: "2px solid #E0E0E0",
        minHeight: "55px",
    },
});

export interface DataTableBodyProps {
    rows: TableObject[];
    columns: TableColumn[];
    primaryAction?: TableAction;
    selected: string[];
    onChange?(newSelection: string[]): void;
    openContextualMenu?(row: TableObject, positionLeft: number, positionTop: number): void;
    enableMultipleAction?: boolean;
}

export function DataTableBody(props: DataTableBodyProps) {
    const {
        rows,
        columns,
        primaryAction,
        selected,
        onChange = () => {},
        openContextualMenu = () => {},
        enableMultipleAction,
    } = props;
    const classes = useStyles();
    const isSelected = (name: string) => selected.indexOf(name) !== -1;

    const contextualAction = (row: TableObject, event: MouseEvent<unknown>) => {
        event.stopPropagation();
        openContextualMenu(row, event.clientY, event.clientX);
    };

    const handleClick = (event: MouseEvent<unknown>, row: any) => {
        const { tagName, type = null } = event.target as HTMLAnchorElement;
        const isCheckboxClick = tagName.localeCompare("input") && type === "checkbox";

        if (event.type === "contextmenu") {
            event.preventDefault();
            contextualAction(row, event);
        } else if (enableMultipleAction && (isEventCtrlClick(event) || isCheckboxClick)) {
            onChange(updateSelection(selected, row));
        } else if (primaryAction && primaryAction.onClick) {
            primaryAction.onClick([row]);
        }
    };

    return (
        <TableBody>
            {rows.map((row, index) => {
                const isItemSelected = isSelected(row.name);
                const labelId = `data-table-row-${index}`;

                return (
                    <TableRow
                        hover
                        onClick={event => handleClick(event, row)}
                        onContextMenu={event => handleClick(event, row)}
                        role="checkbox"
                        aria-checked={isItemSelected}
                        tabIndex={-1}
                        key={row.name}
                        selected={isItemSelected}
                    >
                        {enableMultipleAction && (
                            <TableCell
                                className={classes.cell}
                                key={`${labelId}-checkbox`}
                                padding="checkbox"
                            >
                                <Checkbox
                                    checked={isItemSelected}
                                    inputProps={{ "aria-labelledby": labelId }}
                                />
                            </TableCell>
                        )}
                        {columns.map(column => (
                            <TableCell
                                className={classes.cell}
                                key={`${labelId}-column-${column.name}`}
                                scope="row"
                                padding={enableMultipleAction ? "none" : undefined}
                                align="left"
                            >
                                {formatRowValue(column, row)}
                            </TableCell>
                        ))}
                        <TableCell
                            className={classes.cell}
                            key={`${labelId}-actions`}
                            padding="none"
                            align={"center"}
                        >
                            {primaryAction && (
                                <Tooltip title={i18n.t("Actions")} aria-label="actions">
                                    <IconButton onClick={event => contextualAction(row, event)}>
                                        <MoreVertIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </TableCell>
                    </TableRow>
                );
            })}
        </TableBody>
    );
}
