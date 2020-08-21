import { Wizard, WizardStep } from "d2-ui-components";
import _ from "lodash";
import React from "react";
import { useLocation } from "react-router-dom";
import { Module } from "../../../../domain/modules/entities/Module";
import { metadataModuleSteps, ModuleWizardStepProps } from "./Steps";

export interface ModuleWizardProps {
    onCancel: () => void;
    onClose: () => void;
    module: Module;
    onChange: (module: Module) => void;
}

export const ModuleWizard: React.FC<ModuleWizardProps> = ({
    onCancel,
    onClose,
    module,
    onChange,
}) => {
    const location = useLocation();

    const props: ModuleWizardStepProps = { module, onChange, onCancel, onClose };
    const steps = metadataModuleSteps.map(step => ({ ...step, props }));

    const onStepChangeRequest = async (_currentStep: WizardStep, newStep: WizardStep) => {
        const index = _(steps).findIndex(step => step.key === newStep.key);
        return _.take(steps, index).flatMap(({ validationKeys }) =>
            module.validate(validationKeys).map(({ description }) => description)
        );
    };

    const urlHash = location.hash.slice(1);
    const stepExists = steps.find(step => step.key === urlHash);
    const firstStepKey = steps.map(step => step.key)[0];
    const initialStepKey = stepExists ? urlHash : firstStepKey;

    return (
        <Wizard
            useSnackFeedback={true}
            onStepChangeRequest={onStepChangeRequest}
            initialStepKey={initialStepKey}
            lastClickableStepIndex={steps.length - 1}
            steps={steps}
        />
    );
};
