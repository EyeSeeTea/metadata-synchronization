import React, { useState, ReactNode, MouseEvent } from "react";
import _ from "lodash";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import DetailsIcon from "@material-ui/icons/Details";
import { SearchBox } from "d2-ui-components"; // TODO: Migrate when in d2-ui-components

import DataTable, { DataTableProps } from "./DataTable";
import { DetailsBox } from "./DetailsBox";
import { ActionButton } from "./ActionButton";
import { filterObjects } from "./utils/filtering";
import { TableObject, ObjectsTableDetailField, ReferenceObject } from "./types";

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {},
        paper: {
            width: "100%",
            marginBottom: theme.spacing(2),
        },
        title: {
            flex: "1 1 auto",
        },
        searchBox: {
            maxWidth: "350px",
            width: "33%",
        },
    })
);

export interface ObjectsTableProps<T extends ReferenceObject> extends DataTableProps<T> {
    details?: ObjectsTableDetailField<T>[];
    initialSearch?: string;
    onChangeSearch?(search: string): void;
    searchBoxLabel?: string;
    searchBoxColumns?: (keyof T)[];
    onActionButtonClick?(event: MouseEvent<unknown>): void;
    actionButtonLabel?: ReactNode;
}

export default function ObjectsTable<T extends ReferenceObject = TableObject>(
    props: ObjectsTableProps<T>
) {
    const {
        details = [],
        initialSearch,
        onChangeSearch = _.noop,
        searchBoxLabel,
        searchBoxColumns,
        onActionButtonClick,
        actionButtonLabel,
        rows: parentRows,
        actions: parentActions = [],
        filterComponents: parentFilterComponents,
        sideComponents: parentSideComponents,
        ...rest
    } = props;
    const classes = useStyles();

    const [detailsPaneObject, setDetailsPaneObject] = useState<T | null>(null);
    const [searchValue, setSearchValue] = useState(initialSearch);

    const handleDetailsBoxClose = () => {
        setDetailsPaneObject(null);
    };

    const actions = parentActions.map(action => ({
        ...action,
        icon: action.name === "details" && !action.icon ? <DetailsIcon /> : action.icon,
        onClick:
            action.name === "details"
                ? (rows: T[]) => {
                      setDetailsPaneObject(rows[0]);
                      if (action.onClick) action.onClick(rows);
                  }
                : action.onClick,
    }));

    const handleSearchChange = (newSearch: string) => {
        setSearchValue(newSearch);
        onChangeSearch(newSearch);
    };

    const filterComponents = searchBoxColumns
        ? [
              <div key={"objects-table-search-box"} className={classes.searchBox}>
                  <SearchBox
                      value={searchValue}
                      hintText={searchBoxLabel || "Search items"}
                      onChange={handleSearchChange}
                  />
              </div>,
              parentFilterComponents,
          ]
        : parentFilterComponents;

    const sideComponents = detailsPaneObject
        ? [
              <DetailsBox
                  details={details}
                  data={detailsPaneObject}
                  onClose={handleDetailsBoxClose}
              />,
              parentSideComponents,
          ]
        : parentSideComponents;

    const rows =
        searchBoxColumns && searchValue
            ? filterObjects(parentRows, searchBoxColumns, searchValue)
            : parentRows;

    return (
        <div className={classes.root}>
            <DataTable
                rows={rows}
                actions={actions}
                filterComponents={filterComponents}
                sideComponents={sideComponents}
                {...rest}
            />
            {onActionButtonClick && (
                <ActionButton onClick={onActionButtonClick} label={actionButtonLabel} />
            )}
        </div>
    );
}
