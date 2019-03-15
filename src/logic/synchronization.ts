import _ from "lodash";
import { d2ModelFactory } from "../models/d2ModelFactory";
import { cleanObject, getAllReferences } from "../utils/d2";
import { D2 } from "../types/d2";
import {
    NestedRules,
    SynchronizationBuilder,
    SynchronizationResult,
} from "../types/synchronization";
import { mergeCustomizer } from "../utils/lodash";

function buildNestedRules(rules: string[]): NestedRules {
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

export async function fetchMetadata(
    d2: D2,
    type: string,
    ids: string[],
    excludeRules: string[],
    includeRules: string[]
): Promise<SynchronizationResult> {
    const model = d2ModelFactory(d2, type).getD2Model(d2);
    const result: SynchronizationResult = {};

    const nestedExcludeRules: NestedRules = buildNestedRules(excludeRules);
    const nestedIncludeRules: NestedRules = buildNestedRules(includeRules);

    // TODO: Improve model.get(id) approach
    for (const id of ids) {
        const element = await model.get(id);
        const object = cleanObject(element.toJSON(), excludeRules);

        // Store Organisation Unit in result object
        result[model.plural] = result[model.plural] || [];
        result[model.plural].push(object);

        // Get all the referenced metadata
        const references: any = getAllReferences(d2, object, model.name);
        const referenceTypes = _.intersection(_.keys(references), includeRules);
        const promises = _.map(referenceTypes, type =>
            fetchMetadata(
                d2,
                type,
                references[type],
                nestedExcludeRules[type],
                nestedIncludeRules[type]
            )
        );
        const promisesResult: any[] = await Promise.all(promises);
        _.mergeWith(result, ...promisesResult, mergeCustomizer);
    }

    return result;
}

export async function queryMetadata(
    d2: D2,
    type: string,
    ids: string | string[]
): Promise<SynchronizationResult> {
    const myClass = d2ModelFactory(d2, type);

    // Fetch metadata API to export
    const elements = _.isArray(ids) ? ids : [ids];
    return await fetchMetadata(
        d2,
        type,
        elements,
        myClass.getExcludeRules(),
        myClass.getIncludeRules()
    );
}

export async function startSynchronization(d2: D2, builder: SynchronizationBuilder): Promise<void> {
    const fetchPromises = _.keys(builder.metadata).map(type =>
        queryMetadata(d2, type, builder.metadata[type])
    );
    await Promise.all(fetchPromises);
}
