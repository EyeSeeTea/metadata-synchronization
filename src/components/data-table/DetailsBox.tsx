import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import CloseIcon from "@material-ui/icons/Close";

//import { DetailsBoxProps } from "./types";
import Paper from "@material-ui/core/Paper";

const useStyles = makeStyles({
    root: {
        flex: "0 1 0%",
        marginLeft: "1rem",
        marginRight: "1rem",
        padding: "1.5rem",
        opacity: 1,
        maxWidth: 500,
        minWidth: 250,
        height: "0%",
    },
    content: {
        display: "block",
    },
    label: {
        fontWeight: "bold",
    },
    fieldValue: {
        color: "#333",
        minWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    field: {
        paddingBottom: "1rem",
        fontFamily: "Roboto",
    },
    closeButton: {
        cursor: "pointer",
        float: "right",
        display: "inline-block",
        position: "relative",
    },
});

export function DetailsBox(props: any) {
    const classes = useStyles();
    const { detailsPaneObject, columns, setOpenDetailsPane } = props;

    const getDetailBoxContent = () => {
        if (!detailsPaneObject) {
            return <div className="detail-box__status">Loading details...</div>;
        }

        //@ts-ignore
        return columns.map(field => {
            const fieldName = field.name;
            const valueToRender = field.getValue
                ? field.getValue(detailsPaneObject)
                : detailsPaneObject[fieldName];
            if (valueToRender === null) return null;

            return (
                <div key={fieldName} className={classes.field}>
                    <div className={`${classes.fieldValue} ${classes.label}`}>{field.text}</div>

                    <div className={classes.fieldValue}>{valueToRender || "-"}</div>
                </div>
            );
        });
    };

    return (
        <Paper className={classes.root} square>
            <CloseIcon className={classes.closeButton} onClick={() => setOpenDetailsPane(false)} />
            <div className={classes.content}>{getDetailBoxContent()}</div>
        </Paper>
    );
}
