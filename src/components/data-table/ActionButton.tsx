import React, { ReactNode, MouseEvent } from "react";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Fab from "@material-ui/core/Fab";
import AddIcon from "@material-ui/icons/Add";

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            position: "fixed",
            margin: theme.spacing(1),
            bottom: theme.spacing(5),
            right: theme.spacing(9),
        },
    })
);

export interface ActionButtonProps {
    onClick(event: MouseEvent<HTMLButtonElement>): void;
    label?: ReactNode;
}

export function ActionButton(props: ActionButtonProps) {
    const classes = useStyles();
    const { onClick, label } = props;
    const variant = !label || React.isValidElement(label) ? "round" : "extended";

    return (
        <Fab
            color="primary"
            className={classes.root}
            size="large"
            onClick={onClick}
            data-test="objects-table-action-button"
            variant={variant}
        >
            {label || <AddIcon />}
        </Fab>
    );
}
