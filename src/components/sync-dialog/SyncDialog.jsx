import React from "react";
import i18n from "@dhis2/d2-i18n";
import PropTypes from "prop-types";
import { ConfirmationDialog, MultiSelector } from "d2-ui-components";
import DialogContent from "@material-ui/core/DialogContent";
import { withLoading } from "d2-ui-components";

import Instance from "../../models/instance";
import { startSynchronization } from "../../logic/synchronization";

class SyncDialog extends React.Component {
    state = {
        instanceOptions: [],
        targetInstances: [],
    };

    static propTypes = {
        d2: PropTypes.object.isRequired,
        isOpen: PropTypes.bool.isRequired,
        metadata: PropTypes.object.isRequired,
        handleClose: PropTypes.func.isRequired,
        loading: PropTypes.object.isRequired,
    };

    async componentDidMount() {
        const instances = await Instance.list(
            this.props.d2,
            { search: "" },
            { page: 1, pageSize: 1, sorting: [] }
        );
        const instanceOptions = instances.objects.map(instance => ({
            value: instance.id,
            text: `${instance.name} (${instance.url}) [${instance.username}]`,
        }));
        this.setState({ instanceOptions });
    }

    onChangeInstances = targetInstances => {
        this.setState({ targetInstances });
    };

    handleSynchronization = async () => {
        this.props.loading.show(true, i18n.t("Synchronizing metadata"));
        // TODO: Obtain import results and add warnings/errors to the logger
        try {
            await startSynchronization(this.props.d2, {
                metadata: this.props.metadata,
                targetInstances: this.state.targetInstances,
            });
            this.props.handleClose(true);
        } catch (e) {
            this.props.handleClose();
        }
        this.props.loading.reset();
    };

    handleCancel = () => {
        this.props.handleClose();
    };

    render() {
        const { d2, isOpen } = this.props;

        return (
            <React.Fragment>
                <ConfirmationDialog
                    isOpen={isOpen}
                    title={i18n.t("Synchronize Organisation Units")}
                    onSave={this.handleSynchronization}
                    onCancel={this.handleCancel}
                    saveText={i18n.t("Synchronize")}
                    maxWidth={"lg"}
                    fullWidth={true}
                >
                    <DialogContent>
                        <MultiSelector
                            d2={d2}
                            height={300}
                            onChange={this.onChangeInstances}
                            options={this.state.instanceOptions}
                        />
                    </DialogContent>
                </ConfirmationDialog>
            </React.Fragment>
        );
    }
}

export default withLoading(SyncDialog);
