import React from "react";
import { withSnackbar } from "d2-ui-components";
import SyncRule from "../../../models/syncRule";
import i18n from "../../../locales";
import { Toggle } from "../../toogle/Toogle";

interface IncludeExcludeSelectionStepProps {
    syncRule: SyncRule;
    onChange: (syncRule: SyncRule) => void;
}

const IncludeExcludeSelectionStep: React.FC<IncludeExcludeSelectionStepProps> = () => {
    return (
        <React.Fragment>
            <Toggle
                label={i18n.t("Use default configuration")}
                value={true}
                //onValueChange={updateSyncAll}
            />
        </React.Fragment>
    );
};

export default withSnackbar(IncludeExcludeSelectionStep);
