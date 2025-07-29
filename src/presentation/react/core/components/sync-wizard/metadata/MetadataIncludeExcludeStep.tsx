import { CircularProgress, makeStyles, Typography } from "@material-ui/core";
import { MultiSelector, useSnackbar } from "@eyeseetea/d2-ui-components";
import React, { useEffect } from "react";
import i18n from "../../../../../../utils/i18n";
import Dropdown from "../../dropdown/Dropdown";
import { Toggle } from "../../toggle/Toggle";
import { SyncWizardStepProps } from "../Steps";
import { styled } from "styled-components";
import { IncludeObjectsAndReferences, useMetadataIncludeExcludeStep } from "./useMetadataIncludeExcludeStep";
import { useConfigureDependencies } from "./useConfigureDependencies";

const useStyles = makeStyles({
    includeExcludeContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        marginTop: "20px",
    },
    multiselectorContainer: {
        width: "100%",
        paddingTop: "20px",
    },
});

const MetadataIncludeExcludeStep: React.FC<SyncWizardStepProps> = ({ syncRule, onChange }) => {
    const classes = useStyles();
    const snackbar = useSnackbar();

    const {
        error,
        changeUseDefaultIncludeExclude,
        modelSelectItems,
        changeModelName,
        selectedType,
        d2,
        useDefaultIncludeExclude,
        changeInclude,
        ruleOptions,
        includeRules,
        changeIncludeReferencesAndObjectsRules,
        includeRuleOptions,
        includeReferencesAndObjectsRules,
        includeObjectsAndReferencesOptions,
        changeSharingSettingsObjectsAndReferences,
        changeUsersObjectsAndReferences,
        changeOrgUnitsObjectsAndReferences,
        sharingSettingsObjectsAndReferencesValue,
        usersObjectsAndReferencesValue,
        orgUnitsObjectsAndReferencesValue,
        removeDefaultCategoryObjects,
        changeRemoveDefaultCategoryObjects,
    } = useMetadataIncludeExcludeStep(syncRule, onChange);

    useEffect(() => {
        if (error) {
            snackbar.error(error);
        }
    }, [error, snackbar]);

    const {
        configureUserDependencies,
        onChangeConfigureUserDependencies,
        configureOrgUnitsDependencies,
        onChangeConfigureOrgUnitsDependencies,
    } = useConfigureDependencies({
        sharingSettingsObjectsAndReferencesValue,
        usersObjectsAndReferencesValue,
        orgUnitsObjectsAndReferencesValue,
        changeSharingSettingsObjectsAndReferences,
        changeUsersObjectsAndReferences,
        changeOrgUnitsObjectsAndReferences,
    });

    console.debug("Rendering MetadataIncludeExcludeStep");

    return modelSelectItems.length > 0 ? (
        <React.Fragment>
            <div>
                <Toggle
                    label={i18n.t("Configure user dependencies")}
                    onValueChange={onChangeConfigureUserDependencies}
                    value={configureUserDependencies}
                />
                {configureUserDependencies && (
                    <React.Fragment>
                        <DropdownContainer>
                            <Dropdown<IncludeObjectsAndReferences>
                                value={sharingSettingsObjectsAndReferencesValue}
                                items={includeObjectsAndReferencesOptions}
                                label={i18n.t("Include owner and sharing settings")}
                                style={{ width: "100%", marginTop: 20, marginBottom: 20, marginLeft: -10 }}
                                onValueChange={changeSharingSettingsObjectsAndReferences}
                                hideEmpty
                            />
                        </DropdownContainer>
                        <DropdownContainer>
                            <Dropdown<IncludeObjectsAndReferences>
                                value={usersObjectsAndReferencesValue}
                                items={includeObjectsAndReferencesOptions}
                                label={i18n.t("Include users")}
                                style={{ width: "100%", marginTop: 20, marginBottom: 20, marginLeft: -10 }}
                                onValueChange={changeUsersObjectsAndReferences}
                                hideEmpty
                            />
                        </DropdownContainer>
                    </React.Fragment>
                )}
            </div>
            <div>
                <Toggle
                    label={i18n.t("Configure organisation units dependencies")}
                    onValueChange={onChangeConfigureOrgUnitsDependencies}
                    value={configureOrgUnitsDependencies}
                />
                {configureOrgUnitsDependencies && (
                    <DropdownContainer>
                        <Dropdown<IncludeObjectsAndReferences>
                            value={orgUnitsObjectsAndReferencesValue}
                            items={includeObjectsAndReferencesOptions}
                            label={i18n.t("Include organisation units")}
                            style={{ width: "100%", marginTop: 20, marginBottom: 20, marginLeft: -10 }}
                            onValueChange={changeOrgUnitsObjectsAndReferences}
                            hideEmpty
                        />
                    </DropdownContainer>
                )}
            </div>
            {syncRule.type === "metadata" && (
                <div>
                    <Toggle
                        label={i18n.t(
                            "Remove default categories, categoryOptions, categoryCombos and categoryOptionCombos"
                        )}
                        onValueChange={changeRemoveDefaultCategoryObjects}
                        value={removeDefaultCategoryObjects || false}
                    />
                </div>
            )}

            <Toggle
                label={i18n.t("Use default dependencies")}
                value={useDefaultIncludeExclude}
                onValueChange={changeUseDefaultIncludeExclude}
            />
            {!useDefaultIncludeExclude && (
                <div className={classes.includeExcludeContainer}>
                    <Dropdown
                        key={"model-selection"}
                        items={modelSelectItems}
                        onValueChange={changeModelName}
                        value={selectedType}
                        label={i18n.t("Metadata type")}
                    />

                    {selectedType && (
                        <>
                            <div className={classes.multiselectorContainer}>
                                <MultiSelectorTitle
                                    left={i18n.t("Exclude dependencies")}
                                    right={i18n.t("Include dependencies")}
                                />
                                <MultiSelector
                                    d2={d2}
                                    height={300}
                                    onChange={changeInclude}
                                    options={ruleOptions}
                                    selected={includeRules}
                                />
                            </div>
                            <div className={classes.multiselectorContainer}>
                                <MultiSelectorTitle
                                    left={i18n.t("Include only references")}
                                    right={i18n.t("Include references and objects")}
                                />
                                <MultiSelector
                                    d2={d2}
                                    height={300}
                                    onChange={changeIncludeReferencesAndObjectsRules}
                                    options={includeRuleOptions}
                                    selected={includeReferencesAndObjectsRules}
                                />
                            </div>
                        </>
                    )}
                </div>
            )}
        </React.Fragment>
    ) : (
        <LoadingContainer>
            <CircularProgress />
        </LoadingContainer>
    );
};

export default React.memo(MetadataIncludeExcludeStep);

/**
 * Display a title above each select box in the MultiSelector.
 * @todo `@eyeseetea/d2-ui-components/Multiselector` should implement this
 */
const MultiSelectorTitle: React.FC<{ left: string; right: string }> = ({ left, right }) => (
    <MultiSelectorTitleContainer>
        <Typography>{left}</Typography>
        <div />
        <Typography>{right}</Typography>
    </MultiSelectorTitleContainer>
);

const MultiSelectorTitleContainer = styled.div`
    display: grid;
    grid-template-columns: 1fr 120px 1fr 2.5rem;
`;

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
`;

const DropdownContainer = styled.div`
    width: fit-content;
    min-width: 350px;
`;
