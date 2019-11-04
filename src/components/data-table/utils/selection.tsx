import _ from "lodash";
import i18n from "@dhis2/d2-i18n";

import { TableObject, TableAction, TablePagination, TableNotification } from "../types";

export function updateSelection(selected: string[], row: TableObject) {
    let newSelected: string[] = [];
    const selectedIndex = selected.indexOf(row.id);

    if (selectedIndex === -1) {
        newSelected = newSelected.concat(selected, row.id);
    } else if (selectedIndex === 0) {
        newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
        newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
        newSelected = newSelected.concat(
            selected.slice(0, selectedIndex),
            selected.slice(selectedIndex + 1)
        );
    }

    return newSelected;
}

export function isEventCtrlClick(event: React.MouseEvent<unknown>) {
    return event && event.ctrlKey;
}

export function getActionRows(row: TableObject, rows: TableObject[], selection: string[]) {
    const rowInSelection = !!selection.find(id => row.id === id);

    return rowInSelection ? _.compact(selection.map(id => _.find(rows, { id }))) : [row];
}

export function parseActions(actionRows: TableObject[], availableActions: TableAction[]) {
    return _(availableActions)
        .filter(actionRows.length > 1 ? "multiple" : "name")
        .filter(action => !action.isActive || action.isActive(actionRows))
        .value();
}

export function getSelectionMessages(
    rows: TableObject[],
    selection: string[],
    pagination: TablePagination,
    idsForSelectInAllPages: string[]
): TableNotification[] {
    if (_.isEmpty(rows)) return [];

    const allSelected = selection.length === pagination.total;
    const selectionInOtherPages = _.difference(selection, rows.map(dr => dr.id));
    const allSelectedInPage = rows.every(row => _.includes(selection, row.id));
    const multiplePagesAvailable = pagination.total > rows.length;
    const selectAllImplemented = idsForSelectInAllPages.length === pagination.total;

    return _.compact([
        allSelected
            ? {
                  message: i18n.t("There are {{total}} items selected in all pages.", {
                      total: selection.length,
                  }),
                  link: i18n.t("Clear selection"),
                  newSelection: [],
              }
            : null,
        !allSelected && selectionInOtherPages.length > 0
            ? {
                  message: i18n.t(
                      "There are {{count}} items selected ({{invisible}} on other pages).",
                      { count: selection.length, invisible: selectionInOtherPages.length }
                  ),
                  link: i18n.t("Clear selection"),
                  newSelection: [],
              }
            : null,
        !allSelected && allSelectedInPage && multiplePagesAvailable && selectAllImplemented
            ? {
                  message: i18n.t("All {{total}} items on this page are selected.", {
                      total: rows.length,
                  }),
                  link: i18n.t("Select all {{total}} items in all pages", {
                      total: pagination.total,
                  }),
                  newSelection: idsForSelectInAllPages,
              }
            : null,
    ]);
}
