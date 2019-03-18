import React from "react";
import PropTypes from "prop-types";
import { withRouter } from "react-router-dom";
import i18n from "@dhis2/d2-i18n";
import { ObjectsTable } from "d2-ui-components";
import Fab from "@material-ui/core/Fab";
import { withStyles } from "@material-ui/core/styles";
import SyncIcon from "@material-ui/icons/Sync";
import PageHeader from "../shared/PageHeader";
import { queryMetadata } from "../../logic/synchronization";

const styles = theme => ({
    fab: {
        margin: theme.spacing.unit,
        position: "fixed",
        bottom: theme.spacing.unit * 5,
        right: theme.spacing.unit * 5,
    },
    tableContainer: { marginTop: -10 },
});

class BaseSyncConfigurator extends React.Component {
    state = {
        tableKey: Math.random(),
        selection: [],
    };

    static propTypes = {
        d2: PropTypes.object.isRequired,
        model: PropTypes.func.isRequired,
        history: PropTypes.object.isRequired,
        title: PropTypes.string.isRequired,
    };

    actions = [
        {
            name: "details",
            text: i18n.t("Details"),
            multiple: false,
            type: "details",
        },
    ];

    backHome = () => {
        this.props.history.push("/");
    };

    selectionChange = selection => {
        this.setState({ selection });
    };

    startSynchronization = () => {
        // TODO: Render new dialog to show summary and select destination instances
        queryMetadata(this.props.d2, "organisationUnit", "zGv4gjlRmCX").then(result =>
            console.log(result)
        );
    };

    render() {
        const { d2, model, title, classes } = this.props;

        // Wrapper method to preserve static context
        const list = (...params) => model.listMethod(...params);

        return (
            <React.Fragment>
                <PageHeader onBackClick={this.backHome} title={title} />
                <div className={classes.tableContainer}>
                    <ObjectsTable
                        key={this.state.tableKey}
                        d2={d2}
                        model={model.getD2Model(d2)}
                        columns={model.getColumns()}
                        detailsFields={model.getDetails()}
                        pageSize={20}
                        initialSorting={model.getInitialSorting()}
                        actions={this.actions}
                        list={list}
                        onSelectionChange={this.selectionChange}
                    />
                    <Fab
                        color="primary"
                        aria-label="Add"
                        className={classes.fab}
                        size="large"
                        onClick={this.startSynchronization}
                        data-test="list-action-bar"
                    >
                        <SyncIcon />
                    </Fab>
                </div>
            </React.Fragment>
        );
    }
}

export default withRouter(withStyles(styles)(BaseSyncConfigurator));
