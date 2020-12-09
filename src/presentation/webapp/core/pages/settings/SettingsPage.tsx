import { FormGroup, makeStyles } from "@material-ui/core";
import React from "react";
import { useHistory } from "react-router-dom";
import i18n from "../../../../../locales";
import PageHeader from "../../../../react/core/components/page-header/PageHeader";
import { StorageSettingDropdown } from "./storage/StorageSettingDropdown";

export const SettingsPage: React.FC = () => {
    const history = useHistory();
    const classes = useStyles();

    const backHome = () => history.push("/dashboard");

    return (
        <React.Fragment>
            <PageHeader title={i18n.t("Settings")} onBackClick={backHome} />

            <div className={classes.container}>
                <h3 className={classes.title}>{i18n.t("Storage")}</h3>

                <FormGroup className={classes.content} row={true}>
                    <StorageSettingDropdown />
                </FormGroup>
            </div>
        </React.Fragment>
    );
};

const useStyles = makeStyles({
    content: { margin: "1rem", marginBottom: 35, marginLeft: 0 },
    title: { marginTop: 0 },
    container: { margin: "1rem" },
});
