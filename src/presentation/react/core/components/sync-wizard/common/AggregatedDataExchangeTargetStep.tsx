import React, { useCallback } from "react";
import { Instance } from "../../../../../../domain/instance/entities/Instance";
import GeneralInfoForm from "../../../../../webapp/core/pages/instance-creation/GeneralInfoForm";
import { SyncWizardStepProps } from "../Steps";

const AggregatedDataExchangeTargetStep: React.FC<SyncWizardStepProps> = ({ syncRule, onChange }) => {
    const onInstanceChange = useCallback(
        (instance: Instance) => {
            const newSyncRule = syncRule.updateAggregatedDataExchangeTarget(instance);
            onChange(newSyncRule);
        },
        [onChange, syncRule]
    );

    return (
        <React.Fragment>
            {syncRule.aggregatedDataExchangeTarget && (
                <GeneralInfoForm
                    onChange={onInstanceChange}
                    instance={syncRule.aggregatedDataExchangeTarget}
                    testConnectionVisible={true}
                    mode={"basic"}
                />
            )}
        </React.Fragment>
    );
};

export default AggregatedDataExchangeTargetStep;
