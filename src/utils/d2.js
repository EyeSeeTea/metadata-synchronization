import _ from "lodash";
import i18n from "@dhis2/d2-i18n";
import { mergeCustomizer } from "./lodash";

export const d2BaseModelColumns = [
    { name: "displayName", text: i18n.t("Name"), sortable: true },
    { name: "lastUpdated", text: i18n.t("Last update"), sortable: true },
];

export const d2BaseModelDetails = [
    { name: "displayName", text: i18n.t("Name") },
    { name: "shortName", text: i18n.t("Short name") },
    { name: "code", text: i18n.t("Code") },
    { name: "displayDescription", text: i18n.t("Description") },
    { name: "created", text: i18n.t("Created") },
    { name: "lastUpdated", text: i18n.t("Last update") },
    { name: "id", text: i18n.t("ID") },
    { name: "href", text: i18n.t("API link") },
];

export function cleanParams(options) {
    return _.omitBy(options, value => _.isArray(value) && _.isEmpty(value));
}

export function cleanModelName(id, caller) {
    const alias = ["parent", "children", "ancestors"];
    return alias.includes(id) ? caller : id;
}

export function cleanObject(element, excludeRules) {
    return _.pick(element, _.difference(_.keys(element), excludeRules));
}

export function isD2Model(d2, modelName) {
    return d2.models[modelName] !== undefined;
}

export function isValidUid(code) {
    const CODE_PATTERN = /^[a-zA-Z][a-zA-Z0-9]{10}$/;
    return code !== null && CODE_PATTERN.test(code);
}

export function getAllReferences(d2, obj, type, parents = []) {
    let result = {};
    _.forEach(obj, (value, key) => {
        if (_.isObject(value) || _.isArray(value)) {
            const recursive = getAllReferences(d2, value, type, [...parents, key]);
            result = _.mergeWith(result, recursive, mergeCustomizer);
        } else if (isValidUid(value)) {
            const metadataType = _(parents)
                .map(k => cleanModelName(k, type))
                .filter(k => isD2Model(d2, k))
                .first();
            if (metadataType) {
                result[metadataType] = result[metadataType] || [];
                result[metadataType].push(value);
            }
        }
    });
    return result;
}
