import _ from "lodash";

// Retrieve parents from rule
// for example:
// for input: "organisationUnitGroups"
// return   []
// for input: "organisationUnitGroups.organisationUnitGroupSets"
// return   ["organisationUnitGroups"]
// for input: "organisationUnitGroups.organisationUnitGroupSets.attributes"
// return   ["organisationUnitGroups.organisationUnitGroupSets","organisationUnitGroups"]
export function extractParentsFromRule(rule: string): string[] {
    const parts = rule.split(".");
    return _(parts.length)
        .range(0)
        .map(index => _.take(parts, index).join("."))
        .drop(1)
        .value();
}
