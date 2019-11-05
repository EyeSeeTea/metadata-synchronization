import React, { useState, ReactNode, MouseEvent } from "react";
import _ from "lodash";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import DetailsIcon from "@material-ui/icons/Details";

import DataTable, { DataTableProps } from "./DataTable";
import { DetailsBox } from "./DetailsBox";
import { TableObject, ObjectsTableDetailField } from "./types";
import { ActionButton } from "./ActionButton";
import { SearchBox } from "d2-ui-components";
import { filterObjects } from "./utils/filtering";

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

export interface ObjectsTableProps extends DataTableProps {
    detailFields?: ObjectsTableDetailField[];
    initialSearch?: string;
    onChangeSearch?(search: string): void;
    onButtonClick?(event: MouseEvent<unknown>): void;
    buttonLabel?: ReactNode;
    searchBoxLabel?: string;
}

export default function ObjectsTable(props: ObjectsTableProps) {
    const {
        rows: parentRows,
        detailFields = [],
        actions: parentActions = [],
        filterComponents: parentFilterComponents,
        onButtonClick,
        buttonLabel,
        initialSearch,
        searchBoxLabel,
        onChangeSearch = _.noop,
        ...rest
    } = props;
    const classes = useStyles();

    const [detailsPaneObject, setDetailsPaneObject] = useState<TableObject | null>(null);
    const [searchValue, setSearchValue] = useState(initialSearch);

    const handleDetailsBoxClose = () => {
        setDetailsPaneObject(null);
    };

    const actions = parentActions.map(action => ({
        ...action,
        icon: action.name === "details" && !action.icon ? <DetailsIcon /> : action.icon,
        onClick:
            action.name === "details"
                ? (rows: TableObject[]) => {
                      setDetailsPaneObject(rows[0]);
                      if (action.onClick) action.onClick(rows);
                  }
                : action.onClick,
    }));

    const handleSearchChange = (newSearch: string) => {
        setSearchValue(newSearch);
        onChangeSearch(newSearch);
    };

    const filterComponents = _.isNull(searchBoxLabel)
        ? parentFilterComponents
        : [
              <div key={"objects-table-search-box"} className={classes.searchBox}>
                  <SearchBox
                      value={searchValue}
                      hintText={searchBoxLabel || "Search items"}
                      onChange={handleSearchChange}
                  />
              </div>,
              parentFilterComponents,
          ];

    const rows = searchValue ? filterObjects(parentRows, searchValue) : parentRows;

    return (
        <div className={classes.root}>
            <DataTable rows={rows} actions={actions} filterComponents={filterComponents} {...rest}>
                {detailsPaneObject && (
                    <DetailsBox
                        detailFields={detailFields}
                        data={detailsPaneObject}
                        onClose={handleDetailsBoxClose}
                    />
                )}
            </DataTable>
            {onButtonClick && <ActionButton onClick={onButtonClick} label={buttonLabel} />}
        </div>
    );
}
