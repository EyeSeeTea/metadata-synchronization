import { IconButton, Tooltip } from "@material-ui/core";
import ListIcon from "@material-ui/icons/List";
import React from "react";
import { useHistory } from "react-router-dom";
import i18n from "../../../../utils/i18n";

export function WmrLogsButton() {
    const history = useHistory();
    const openLogs = React.useCallback(() => history.push("/history/aggregated"), [history]);
    const label = i18n.t("Logs");

    return (
        <Tooltip title={label}>
            <IconButton aria-label={label} onClick={openLogs}>
                <ListIcon />
            </IconButton>
        </Tooltip>
    );
}
