import React, { useState, ReactNode } from "react";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import DetailsIcon from "@material-ui/icons/Details";

import DataTable, { DataTableProps } from "./DataTable";
import { DetailsBox } from "./DetailsBox";
import { TableObject, ObjectsTableDetailField } from "./types";

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
    })
);

export interface ObjectsTableProps extends DataTableProps {
    detailFields?: ObjectsTableDetailField[];
    initialSearch?: string;
    onChangeSearch?(search: string): void;
    onButtonClick?: Function;
    buttonLabel?: ReactNode;
    customFilters?: ReactNode;
    hideSearchBox?: boolean;
    forceSelectionColumn?: boolean;
}

export default function ObjectsTable(props: ObjectsTableProps) {
    const { detailFields = [], actions = [], ...rest } = props;
    const classes = useStyles();

    const [detailsPaneObject, setDetailsPaneObject] = useState<TableObject | null>(null);

    const handleDetailsBoxClose = () => {
        setDetailsPaneObject(null);
    };

    const objectsTableActions = actions.map(action => ({
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

    return (
        <div className={classes.root}>
            <DataTable {...rest} actions={objectsTableActions}>
                {detailsPaneObject && (
                    <DetailsBox
                        detailFields={detailFields}
                        data={detailsPaneObject}
                        onClose={handleDetailsBoxClose}
                    />
                )}
            </DataTable>
        </div>
    );
}
