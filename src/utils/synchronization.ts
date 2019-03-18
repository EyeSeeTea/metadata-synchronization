import _ from "lodash";
import { NestedRules } from "../types/synchronization";

export function buildNestedRules(rules: string[]): NestedRules {
    return _.transform(
        rules,
        (result, value) => {
            const [parentType, childType] = value.split(".");
            result[parentType] = result[parentType] || [];
            if (childType && !result[parentType].includes(childType)) {
                result[parentType].push(childType);
            }
        },
        {}
    );
}
