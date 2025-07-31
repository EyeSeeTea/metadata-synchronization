import React from "react";
import { SynchronizationRule } from "../../../../../../domain/rules/entities/SynchronizationRule";
import {
    getObjectsAndReferencesValue,
    IncludeObjectsAndReferenceOptions,
    IncludeObjectsAndReferences,
} from "./useMetadataIncludeExcludeStep";

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
    changeObjectsAndReferences: (updates: IncludeObjectsAndReferenceOptions) => void;
}

export function useConfigureDependencies(params: UseConfigureDependenciesParams) {
    const {
        sharingSettingsObjectsAndReferencesValue,
        usersObjectsAndReferencesValue,
        orgUnitsObjectsAndReferencesValue,
        changeObjectsAndReferences,
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
                changeObjectsAndReferences({
                    sharingSettings: includeObjectsAndReferencesDefaults.sharingSettingsObjectsAndReferencesValue,
                    users: includeObjectsAndReferencesDefaults.usersObjectsAndReferencesValue,
                });
            }
        },
        [changeObjectsAndReferences]
    );

    const onChangeConfigureOrgUnitsDependencies = React.useCallback(
        (value: boolean) => {
            setConfigureOrgUnitsDependencies(value);
            if (!value) {
                changeObjectsAndReferences({
                    orgUnits: includeObjectsAndReferencesDefaults.orgUnitsObjectsAndReferencesValue,
                });
            }
        },
        [changeObjectsAndReferences]
    );

    return {
        configureUserDependencies,
        configureOrgUnitsDependencies,
        onChangeConfigureUserDependencies,
        onChangeConfigureOrgUnitsDependencies,
    };
}
