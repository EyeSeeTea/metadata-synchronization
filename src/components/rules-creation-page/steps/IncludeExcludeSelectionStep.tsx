import React, { useState } from "react";
import { withSnackbar } from "d2-ui-components";
import SyncRule from "../../../models/syncRule";
import i18n from "../../../locales";
import { Toggle } from "../../toogle/Toogle";

interface IncludeExcludeSelectionStepProps {
    syncRule: SyncRule;
    onChange: (syncRule: SyncRule) => void;
}

const IncludeExcludeSelectionStep: React.FC<IncludeExcludeSelectionStepProps> = ({ syncRule, onChange }) => {
    const [useDefaultIncludeExclude, setUseDefaultIncludeExclude] = useState(syncRule.useDefaultIncludeExclude);

    const changeUseDefaultIncludeExclude = (useDefault: boolean) => {
        debugger;
        setUseDefaultIncludeExclude(useDefault);
        onChange(syncRule.updateUseDefaultIncludeExclude(useDefault));
    };

    return (
        <React.Fragment>
            <Toggle
                label={i18n.t("Use default configuration")}
                value={useDefaultIncludeExclude}
                onValueChange={changeUseDefaultIncludeExclude}
            />
        </React.Fragment>
    );
};

export default withSnackbar(IncludeExcludeSelectionStep);
