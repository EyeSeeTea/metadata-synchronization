import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import Typography from "@material-ui/core/Typography";
import DetailsIcon from "@material-ui/icons/Details";

import { TableAction, TableObject } from "./types";

const useStyles = makeStyles({
    root: {
        position: "fixed",
    },
});

export interface ContextualMenuProps {
    isOpen: boolean;
    rows: TableObject[];
    positionLeft: number;
    positionTop: number;
    closeContextMenu(): void;
    actions: TableAction[];
}

//TODO: Icon
export function ContextualMenu(props: ContextualMenuProps) {
    const classes = useStyles();
    //@ts-ignore
    const { isOpen, rows, positionLeft, positionTop, closeContextMenu, actions } = props;

    return (
        <Menu
            className={classes.root}
            open={isOpen}
            anchorReference="anchorPosition"
            anchorPosition={{
                left: positionLeft,
                top: positionTop,
            }}
            anchorOrigin={{
                vertical: "center",
                horizontal: "center",
            }}
            onClose={closeContextMenu}
        >
            {actions.map(action => (
                <MenuItem
                    key={action.name}
                    onClick={() => {
                        if (action.onClick) action.onClick(rows);
                        closeContextMenu();
                    }}
                >
                    <DetailsIcon style={{ marginRight: "10px" }} fontSize="small" />

                    <Typography variant="inherit" noWrap>
                        {action.text}
                    </Typography>
                </MenuItem>
            ))}
        </Menu>
    );
}
