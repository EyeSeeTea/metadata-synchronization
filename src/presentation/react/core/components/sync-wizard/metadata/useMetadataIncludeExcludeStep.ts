import { D2Api } from "@eyeseetea/d2-api/2.36";
import _ from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Instance } from "../../../../../../domain/instance/entities/Instance";
import { MetadataEntity, MetadataPackage } from "../../../../../../domain/metadata/entities/MetadataEntities";
import { includeExcludeRulesFriendlyNames } from "../../../../../../domain/metadata/entities/MetadataFriendlyNames";
import { SynchronizationRule } from "../../../../../../domain/rules/entities/SynchronizationRule";
import i18n from "../../../../../../locales";
import { D2Model } from "../../../../../../models/dhis/default";
import { defaultName, modelFactory } from "../../../../../../models/dhis/factory";
import { useAppContext } from "../../../contexts/AppContext";
import { DropdownOption } from "../../dropdown/Dropdown";

export function useMetadataIncludeExcludeStep(
    syncRule: SynchronizationRule,
    onChange: (syncRule: SynchronizationRule) => void
) {
    const { d2, api, compositionRoot } = useAppContext();
    const [modelSelectItems, setModelSelectItems] = useState<DropdownOption[]>([]);
    const [models, setModels] = useState<typeof D2Model[]>([]);
    const [pendingApplyUseDefaultChange, setPendingApplyUseDefaultChange] = useState(false);
    const [selectedType, setSelectedType] = useState<string>("");
    const [error, setError] = useState<string>();
    const [instance, setInstance] = useState<Instance>();

    useEffect(() => {
        compositionRoot.instances.getById(syncRule.originInstance).then(result => {
            result.match({
                error: () => setError(i18n.t("Invalid origin instance")),
                success: instance => {
                    setInstance(instance);
                },
            });
        });
    }, [compositionRoot, syncRule.originInstance]);

    const handleDefaultChange = useCallback(
        (models: typeof D2Model[]) => {
            onChange(
                syncRule.useDefaultIncludeExclude
                    ? syncRule.markToUseDefaultIncludeExclude()
                    : syncRule.markToNotUseDefaultIncludeExclude(models)
            );
        },
        [onChange, syncRule]
    );

    useEffect(() => {
        compositionRoot.metadata
            .getByIds(syncRule.metadataIds, instance, "id,name,type")
            .then((metadata: MetadataPackage<MetadataEntity>) => {
                const models = getModels(metadata, syncRule.metadataModelsSyncAll);
                const modelSelectItems = getModelSelectItems(models, api);

                setModels(models);
                setModelSelectItems(modelSelectItems);

                if (pendingApplyUseDefaultChange) {
                    handleDefaultChange(models);
                }
            });
    }, [
        compositionRoot,
        api,
        syncRule.metadataIds,
        syncRule.metadataModelsSyncAll,
        pendingApplyUseDefaultChange,
        handleDefaultChange,
        instance,
    ]);

    const syncParams = useMemo(() => syncRule.syncParams, [syncRule.syncParams]);

    const useDefaultIncludeExclude = useMemo(
        () => syncRule.useDefaultIncludeExclude,
        [syncRule.useDefaultIncludeExclude]
    );

    const includeRules = useMemo(() => {
        const { includeRules = [] } = syncRule.metadataIncludeExcludeRules[selectedType] || {};
        return includeRules;
    }, [syncRule.metadataIncludeExcludeRules, selectedType]);

    const includeReferencesAndObjectsRules = useMemo(() => {
        const { includeReferencesAndObjectsRules = [] } = syncRule.metadataIncludeExcludeRules[selectedType] || {};
        return includeReferencesAndObjectsRules;
    }, [syncRule.metadataIncludeExcludeRules, selectedType]);

    const ruleOptions = useMemo(() => {
        const { excludeRules = [] } = syncRule.metadataIncludeExcludeRules[selectedType] || {};
        const allRules = [...includeRules, ...excludeRules];
        return allRules.map(rule => ({
            value: rule,
            text: includeExcludeRulesFriendlyNames[rule] || rule,
        }));
    }, [includeRules, syncRule.metadataIncludeExcludeRules, selectedType]);

    const includeRuleOptions = useMemo(() => {
        return includeRules.map(rule => ({
            value: rule,
            text: includeExcludeRulesFriendlyNames[rule] || rule,
        }));
    }, [includeRules]);

    const changeUseDefaultIncludeExclude = useCallback(
        (useDefault: boolean) => {
            if (models.length === 0) {
                setPendingApplyUseDefaultChange(true);
            }
            onChange(
                useDefault
                    ? syncRule.markToUseDefaultIncludeExclude()
                    : syncRule.markToNotUseDefaultIncludeExclude(models)
            );
        },
        [models, onChange, syncRule]
    );

    const changeModelName = useCallback((modelName: string) => {
        setSelectedType(modelName);
    }, []);

    const changeInclude = useCallback(
        (currentIncludeRules: any) => {
            const type: string = selectedType;

            const oldIncludeRules: string[] = includeRules;

            const ruleToExclude = _.difference(oldIncludeRules, currentIncludeRules);
            const ruleToInclude = _.difference(currentIncludeRules, oldIncludeRules);

            if (ruleToInclude.length > 0) {
                onChange(syncRule.moveRuleFromExcludeToInclude(type, ruleToInclude));
            } else if (ruleToExclude.length > 0) {
                onChange(syncRule.moveRuleFromIncludeToExclude(type, ruleToExclude));
            }
        },
        [includeRules, onChange, selectedType, syncRule]
    );

    const changeIncludeReferencesAndObjectsRules = useCallback(
        (currentIncludeReferencesAndObjectsRules: any) => {
            const type: string = selectedType;

            const oldIncludeReferencesAndObjectsRules: string[] = includeReferencesAndObjectsRules;

            const ruleToIncludeOnlyReferences = _.difference(
                oldIncludeReferencesAndObjectsRules,
                currentIncludeReferencesAndObjectsRules
            );
            const ruleToIncludeReferencesAndObjects = _.difference(
                currentIncludeReferencesAndObjectsRules,
                oldIncludeReferencesAndObjectsRules
            );

            if (ruleToIncludeReferencesAndObjects.length > 0) {
                onChange(
                    syncRule.moveFromIncludeOnlyReferencesToReferencesAndObjects(
                        type,
                        ruleToIncludeReferencesAndObjects
                    )
                );
            } else if (ruleToIncludeOnlyReferences.length > 0) {
                onChange(
                    syncRule.moveRuleFromIncludeReferencesAndObjectsToOnlyReferences(type, ruleToIncludeOnlyReferences)
                );
            }
        },
        [includeReferencesAndObjectsRules, onChange, selectedType, syncRule]
    );

    const changeSharingSettings = useCallback(
        (includeSharingSettings: boolean) => {
            onChange(
                syncRule.updateSyncParams({
                    ...syncRule.syncParams,
                    includeSharingSettings,
                })
            );
        },
        [onChange, syncRule]
    );

    const changeOrgUnitReferences = useCallback(
        (removeOrgUnitReferences: boolean) => {
            onChange(syncRule.updateSyncParams({ ...syncRule.syncParams, removeOrgUnitReferences }));
        },
        [onChange, syncRule]
    );

    const changeRemoveUserObjects = useCallback(
        (removeUserObjects: boolean) => {
            onChange(
                syncRule.updateSyncParams({
                    ...syncRule.syncParams,
                    removeUserObjects,
                })
            );
        },
        [onChange, syncRule]
    );

    const changeRemoveUserObjectsAndReferences = useCallback(
        (removeUserObjectsAndReferences: boolean) => {
            onChange(syncRule.updateSyncParams({ ...syncRule.syncParams, removeUserObjectsAndReferences }));
        },
        [onChange, syncRule]
    );

    const changeRemoveOrgUnitObjects = useCallback(
        (removeOrgUnitObjects: boolean) => {
            onChange(
                syncRule.updateSyncParams({
                    ...syncRule.syncParams,
                    removeOrgUnitObjects,
                })
            );
        },
        [onChange, syncRule]
    );

    return {
        error,
        d2,
        syncParams,
        useDefaultIncludeExclude,
        changeUseDefaultIncludeExclude,
        changeModelName,
        changeInclude,
        modelSelectItems,
        selectedType,
        ruleOptions,
        includeRules,
        changeIncludeReferencesAndObjectsRules,
        includeRuleOptions,
        includeReferencesAndObjectsRules,
        changeSharingSettings,
        changeOrgUnitReferences,
        changeRemoveOrgUnitObjects,
        changeRemoveUserObjects,
        changeRemoveUserObjectsAndReferences,
    };
}

function getModelSelectItems(models: typeof D2Model[], api: D2Api) {
    return models
        .filter(model => model.getMetadataType() !== defaultName)
        .map(model => {
            const apiModel = api.models[model.getCollectionName()];
            return apiModel.schema;
        })
        .map(schema => ({
            name: schema.displayName,
            id: schema.name,
        }));
}

function getModels(metadata: MetadataPackage<MetadataEntity>, metadataModelsSyncAll: string[]) {
    return _(metadata)
        .keys()
        .concat(metadataModelsSyncAll)
        .sort()
        .uniq()
        .value()
        .map(type => modelFactory(type));
}
