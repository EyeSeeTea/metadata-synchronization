import {
    DataElementModel,
    defaultModel,
    IndicatorModel,
    OrganisationUnitModel,
    ValidationRuleModel,
} from "./d2Model";

const classes = {
    OrganisationUnitModel,
    DataElementModel,
    IndicatorModel,
    ValidationRuleModel,
};

/**
 * D2ModelProxy allows to create on-demand d2Model classes
 * If the class doesn't exist a new default class is created
 * d2ModelName: string (singular name property from d2.models)
 */
export function d2ModelFactory(d2ModelName) {
    const modelName = d2ModelName.charAt(0).toUpperCase() + d2ModelName.slice(1) + "Model";
    return classes[modelName] ? classes[modelName] : defaultModel(d2ModelName);
}
