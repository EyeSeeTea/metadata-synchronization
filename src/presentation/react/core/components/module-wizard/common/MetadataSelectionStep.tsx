import { useSnackbar } from "@eyeseetea/d2-ui-components";
import _ from "lodash";
import { useCallback } from "react";
import { MetadataModule } from "../../../../../../domain/modules/entities/MetadataModule";
import i18n from "../../../../../../utils/i18n";
import {
    DashboardModel,
    DataSetModel,
    ProgramModel,
    ProgramRuleModel,
    RelationshipTypeModel,
    UserGroupModel,
} from "../../../../../../models/dhis/metadata";
import MetadataTable from "../../metadata-table/MetadataTable";
import { useLatestRef } from "../../../hooks/useLatestRef";
import { ModuleWizardStepProps } from "../Steps";

const config = {
    module: {
        metadata: {
            models: [
                DataSetModel,
                ProgramModel,
                ProgramRuleModel,
                DashboardModel,
                RelationshipTypeModel,
                UserGroupModel,
            ],
            childrenKeys: [],
        },
    },
};

export const MetadataSelectionStep = ({ module, onChange }: ModuleWizardStepProps<MetadataModule>) => {
    const snackbar = useSnackbar();
    const { models, childrenKeys } = config["module"][module.type];
    const moduleRef = useLatestRef(module);

    const changeSelection = useCallback(
        (newMetadataIds: string[], newExcludedIds: string[]) => {
            const previousMetadataIds = moduleRef.current.metadataIds;
            const additions = _.difference(newMetadataIds, previousMetadataIds);
            if (additions.length > 0) {
                snackbar.info(i18n.t("Selected {{difference}} elements", { difference: additions.length }), {
                    autoHideDuration: 1000,
                });
            }

            const removals = _.difference(previousMetadataIds, newMetadataIds);
            if (removals.length > 0) {
                snackbar.info(
                    i18n.t("Removed {{difference}} elements", {
                        difference: Math.abs(removals.length),
                    }),
                    { autoHideDuration: 1000 }
                );
            }

            const updatedModule = moduleRef.current.update({
                metadataIds: newMetadataIds,
                excludedIds: newExcludedIds,
            });
            moduleRef.current = updatedModule;
            onChange(updatedModule);
        },
        [moduleRef, onChange, snackbar]
    );

    return (
        <MetadataTable
            models={models}
            selectedIds={module.metadataIds}
            excludedIds={module.excludedIds}
            notifyNewSelection={changeSelection}
            childrenKeys={childrenKeys}
            showIndeterminateSelection={true}
        />
    );
};
