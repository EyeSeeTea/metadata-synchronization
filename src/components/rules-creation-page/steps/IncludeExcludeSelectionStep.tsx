import React, { useState, useEffect } from "react";
import { withSnackbar } from "d2-ui-components";
import SyncRule from "../../../models/syncRule";
import i18n from "../../../locales";
import { Toggle } from "../../toogle/Toogle";
import { getMetadata } from "../../../utils/synchronization";
import { getBaseUrl } from "../../../utils/d2";
import { D2 } from "../../../types/d2";
import _ from "lodash";
import Dropdown from "../../dropdown/Dropdown";

interface IncludeExcludeSelectionStepProps {
    classes: any;
    d2: D2;
    syncRule: SyncRule;
    onChange: (syncRule: SyncRule) => void;
}

interface ModelSelectItem {
    name: string;
    id: string;
}

const IncludeExcludeSelectionStep: React.FC<IncludeExcludeSelectionStepProps> = ({
    d2,
    syncRule,
    onChange,
}) => {
    const [useDefaultIncludeExclude, setUseDefaultIncludeExclude] = useState<boolean>(
        syncRule.useDefaultIncludeExclude
    );
    const [models, setModels] = useState<Array<ModelSelectItem>>([]);
    const [selectedModel, setSelectedModel] = useState<string | undefined>();

    useEffect(() => {
        getMetadata(getBaseUrl(d2), syncRule.metadataIds, "id,name").then((metadata: any) =>
            setModels(parseMetadataModels(metadata))
        );
    }, [d2, syncRule]);

    const parseMetadataModels = (metadata: any) => {
        return _.keys(metadata).map(type => ({
            name: type,
            id: type,
        }));
    };

    const changeUseDefaultIncludeExclude = (useDefault: boolean) => {
        setUseDefaultIncludeExclude(useDefault);
        onChange(syncRule.updateUseDefaultIncludeExclude(useDefault));
    };

    const changeModelName = (event: any) => {
        setSelectedModel(event.target.value);
    };

    return (
        <React.Fragment>
            <Toggle
                label={i18n.t("Use default configuration")}
                value={useDefaultIncludeExclude}
                onValueChange={changeUseDefaultIncludeExclude}
            />
            {!syncRule.useDefaultIncludeExclude && (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        marginTop: "20px",
                    }}
                >
                    <Dropdown
                        key={"model-selection"}
                        items={models}
                        onChange={changeModelName}
                        value={selectedModel ? selectedModel : ""}
                        label={i18n.t("Metadata type")}
                    />
                </div>
            )}
        </React.Fragment>
    );
};

export default withSnackbar(IncludeExcludeSelectionStep);
