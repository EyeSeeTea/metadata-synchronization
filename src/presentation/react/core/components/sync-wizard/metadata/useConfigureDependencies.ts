import React from "react";
import { SynchronizationRule } from "../../../../../../domain/rules/entities/SynchronizationRule";
import { getObjectsAndReferencesValue, IncludeObjectsAndReferences } from "./useMetadataIncludeExcludeStep";

const includeObjectsAndReferencesDefaults = {
    sharingSettingsObjectsAndReferencesValue: getObjectsAndReferencesValue(
        SynchronizationRule.syncParamsDefaults.includeSharingSettingsObjectsAndReferences,
        SynchronizationRule.syncParamsDefaults.includeOnlySharingSettingsReferences
    ),
    usersObjectsAndReferencesValue: getObjectsAndReferencesValue(
        SynchronizationRule.syncParamsDefaults.includeUsersObjectsAndReferences,
        SynchronizationRule.syncParamsDefaults.includeOnlyUsersReferences
    ),
    orgUnitsObjectsAndReferencesValue: getObjectsAndReferencesValue(
        SynchronizationRule.syncParamsDefaults.includeOrgUnitsObjectsAndReferences,
        SynchronizationRule.syncParamsDefaults.includeOnlyOrgUnitsReferences
    ),
};

export const isDefaultIncludeObjectsAndReferences = (param: {
    sharingSettingsObjectsAndReferencesValue?: IncludeObjectsAndReferences;
    usersObjectsAndReferencesValue?: IncludeObjectsAndReferences;
    orgUnitsObjectsAndReferencesValue?: IncludeObjectsAndReferences;
}): boolean => {
    return Object.entries(param).every(
        ([key, value]) =>
            value === includeObjectsAndReferencesDefaults[key as keyof typeof includeObjectsAndReferencesDefaults]
    );
};

interface UseConfigureDependenciesParams {
    sharingSettingsObjectsAndReferencesValue: IncludeObjectsAndReferences;
    usersObjectsAndReferencesValue: IncludeObjectsAndReferences;
    orgUnitsObjectsAndReferencesValue: IncludeObjectsAndReferences;
    changeSharingSettingsObjectsAndReferences: (value: IncludeObjectsAndReferences) => void;
    changeUsersObjectsAndReferences: (value: IncludeObjectsAndReferences) => void;
    changeOrgUnitsObjectsAndReferences: (value: IncludeObjectsAndReferences) => void;
}

export function useConfigureDependencies(params: UseConfigureDependenciesParams) {
    const {
        sharingSettingsObjectsAndReferencesValue,
        usersObjectsAndReferencesValue,
        orgUnitsObjectsAndReferencesValue,
        changeSharingSettingsObjectsAndReferences,
        changeUsersObjectsAndReferences,
        changeOrgUnitsObjectsAndReferences,
    } = params;

    const [configureUserDependencies, setConfigureUserDependencies] = React.useState(
        !isDefaultIncludeObjectsAndReferences({
            sharingSettingsObjectsAndReferencesValue,
            usersObjectsAndReferencesValue,
        })
    );

    const [configureOrgUnitsDependencies, setConfigureOrgUnitsDependencies] = React.useState(
        !isDefaultIncludeObjectsAndReferences({
            orgUnitsObjectsAndReferencesValue,
        })
    );

    const onChangeConfigureUserDependencies = React.useCallback(
        (value: boolean) => {
            setConfigureUserDependencies(value);
            if (!value) {
                changeSharingSettingsObjectsAndReferences(
                    includeObjectsAndReferencesDefaults.sharingSettingsObjectsAndReferencesValue
                );
                changeUsersObjectsAndReferences(includeObjectsAndReferencesDefaults.usersObjectsAndReferencesValue);
            }
        },
        [changeSharingSettingsObjectsAndReferences, changeUsersObjectsAndReferences]
    );

    const onChangeConfigureOrgUnitsDependencies = React.useCallback(
        (value: boolean) => {
            setConfigureOrgUnitsDependencies(value);
            if (!value) {
                changeOrgUnitsObjectsAndReferences(
                    includeObjectsAndReferencesDefaults.orgUnitsObjectsAndReferencesValue
                );
            }
        },
        [changeOrgUnitsObjectsAndReferences]
    );

    return {
        configureUserDependencies,
        configureOrgUnitsDependencies,
        onChangeConfigureUserDependencies,
        onChangeConfigureOrgUnitsDependencies,
    };
}
