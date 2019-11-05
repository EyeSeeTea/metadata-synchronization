import React from "react";
import _ from "lodash";
import { makeStyles } from "@material-ui/core/styles";

import { TableNotification } from "./types";

const useStyles = makeStyles({
    notificationPanel: {
        captionSide: "top",
        textAlign: "center",
        padding: "0.5rem",
        backgroundColor: "#E0E0E0",
    },
    notification: {
        padding: "0.75rem",
    },
    notificationText: {
        letterSpacing: ".25px",
        color: "#5F6368",
    },
    notificationLink: {
        letterSpacing: ".25px",
        cursor: "pointer",
        fontWeight: 500,
        color: "#1A73E8",
        padding: "0 8px",
    },
});

export interface DataTableNotificationsProps {
    messages: TableNotification[];
    updateSelection?(selection: string[]): void;
}

export function DataTableNotifications(props: DataTableNotificationsProps) {
    const { messages, updateSelection = _.noop } = props;
    const classes = useStyles();

    return (
        <div className={classes.notificationPanel}>
            {messages.map((notification, index) => (
                <div className={classes.notification} key={"notification-" + index}>
                    <span className={classes.notificationText}>{notification.message}</span>
                    {notification.link && (
                        <span
                            className={classes.notificationLink}
                            onClick={() =>
                                notification.newSelection &&
                                updateSelection(notification.newSelection)
                            }
                        >
                            {notification.link}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}
