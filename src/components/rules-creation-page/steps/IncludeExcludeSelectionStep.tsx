import React, { useState, useEffect } from "react";
import { withSnackbar } from "d2-ui-components";
import SyncRule from "../../../models/syncRule";
import i18n from "../../../locales";
import { Toggle } from "../../toogle/Toogle";
import { getMetadata } from "../../../utils/synchronization";
import { getBaseUrl } from "../../../utils/d2";
import { D2, ModelDefinition } from "../../../types/d2";
import _ from "lodash";
import Dropdown from "../../dropdown/Dropdown";
import { d2ModelFactory } from "../../../models/d2ModelFactory";
import { D2Model } from "../../../models/d2Model";
import { MultiSelector } from "d2-ui-components";

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
    const [modelSelectItems, setModelSelectItems] = useState<Array<ModelSelectItem>>([]);
    const [models, setModels] = useState<Array<typeof D2Model>>([]);
    const [selectedType, setSelectedType] = useState<string | undefined>();

    useEffect(() => {
        getMetadata(getBaseUrl(d2), syncRule.metadataIds, "id,name").then((metadata: any) => {
            const models = _.keys(metadata).map((type: string) => {
                return d2ModelFactory(d2, type);
            });

            const parseModels = (models: typeof D2Model[]) =>
                models
                    .map((model: typeof D2Model) => model.getD2Model(d2))
                    .map((model: ModelDefinition) => ({
                        name: model.displayName,
                        id: model.name,
                    }));

            setModels(models);
            setModelSelectItems(parseModels(models));
        });

        console.log(syncRule.metadataExcludeIncludeRules);
    }, [d2, syncRule]);

    const changeUseDefaultIncludeExclude = (useDefault: boolean) => {
        onChange(
            useDefault
                ? syncRule.markToUseDefaultIncludeExclude()
                : syncRule.markToNotUseDefaultIncludeExclude(models)
        );
    };

    const changeModelName = (event: any) => {
        setSelectedType(event.target.value);
    };

    const changeInclude = (includeRules: any) => {
        const type: string = selectedType ?? "";

        const rules = {
            ...syncRule.metadataExcludeIncludeRules,
            [type]: {
                includeRules: includeRules,
                excludeRules: getAllRules().filter(rule => !includeRules.includes(rule)),
            },
        };

        onChange(syncRule.updateMetadataIncludeExcludeRules(rules));
    };

    const getAllRules = () => {
        const allRules =
            selectedType && syncRule.metadataExcludeIncludeRules
                ? [
                      ...syncRule.metadataExcludeIncludeRules[selectedType].excludeRules,
                      ...syncRule.metadataExcludeIncludeRules[selectedType].includeRules,
                  ].sort()
                : [];

        return allRules;
    };

    const getOptions = () => {
        const allRules = getAllRules();

        return allRules.map(rule => ({
            value: rule,
            text: rule,
        }));
    };

    const getIncludeRules = () => {
        return selectedType && syncRule.metadataExcludeIncludeRules
            ? syncRule.metadataExcludeIncludeRules[selectedType].includeRules
            : [];
    };

    return (
        <React.Fragment>
            <Toggle
                label={i18n.t("Use default configuration")}
                value={syncRule.useDefaultIncludeExclude}
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
                        items={modelSelectItems}
                        onChange={changeModelName}
                        value={selectedType ? selectedType : ""}
                        label={i18n.t("Metadata type")}
                    />

                    {selectedType && (
                        <div style={{ width: "100%" }}>
                            <MultiSelector
                                style={{ width: "100%" }}
                                d2={d2}
                                height={300}
                                onChange={changeInclude}
                                options={getOptions()}
                                selected={getIncludeRules()}
                            />
                        </div>
                    )}
                </div>
            )}
        </React.Fragment>
    );
};

export default withSnackbar(IncludeExcludeSelectionStep);
