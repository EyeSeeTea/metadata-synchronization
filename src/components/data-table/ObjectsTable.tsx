import React, { useState, ReactNode } from "react";
import _ from "lodash";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";

import DataTable, { DataTableProps } from "./DataTable";
//import { cleanObjects } from "./utils/sorting";
import { TableObject, TablePagination } from "./types";
import { DetailsBox } from "./DetailsBox";

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
    pagination?: TablePagination; // Uncontrolled
    initialPagination?: TablePagination;
    onChangePagination?(pagination: TablePagination): void;
    initialSearch?: string;
    onChangeSearch?(search: string): void;
    onButtonClick?: Function;
    buttonLabel?: ReactNode;
    customFilters?: ReactNode;
    hideSearchBox?: boolean;
    forceSelectionColumn?: boolean;
}

export default function ObjectsTable(props: ObjectsTableProps) {
    const classes = useStyles();

    // Details
    //@ts-ignore
    const [openDetailsPane, setOpenDetailsPane] = useState(false);
    //@ts-ignore
    const [detailsPaneObject, setDetailsPaneObject] = useState<TableObject | null>(null);

    return (
        <div className={classes.root}>
            <DataTable rows={props.rows} columns={props.columns}>
                <DetailsBox />
            </DataTable>
        </div>
    );
}
