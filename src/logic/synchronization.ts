import _ from "lodash";
import "../utils/lodash-mixins";

import { d2ModelFactory } from "../models/d2ModelFactory";
import { D2 } from "../types/d2";
import { cleanObject, getAllReferences, getMetadata } from "../utils/d2";
import {
    FetchBuilder,
    NestedRules,
    SynchronizationBuilder,
    SynchronizationResult,
} from "../types/synchronization";
import { buildNestedRules } from "../utils/synchronization";

export async function fetchMetadata(d2: D2, builder: FetchBuilder): Promise<SynchronizationResult> {
    const { type, ids, excludeRules, includeRules } = builder;
    const model = d2ModelFactory(d2, type).getD2Model(d2);
    const result: SynchronizationResult = {};

    const nestedExcludeRules: NestedRules = buildNestedRules(excludeRules);
    const nestedIncludeRules: NestedRules = buildNestedRules(includeRules);

    const elements = await getMetadata(d2, ids);
    for (const element of elements[model.plural]) {
        const object = cleanObject(element, excludeRules);

        // Store Organisation Unit in result object
        result[model.plural] = result[model.plural] || [];
        result[model.plural].push(object);

        // Get all the referenced metadata
        const references: any = getAllReferences(d2, object, model.name);
        const referenceTypes = _.intersection(_.keys(references), includeRules);
        const promises = _.map(referenceTypes, type => {
            return {
                type,
                ids: references[type],
                excludeRules: nestedExcludeRules[type],
                includeRules: nestedIncludeRules[type],
            };
        }).map(newBuilder => fetchMetadata(d2, newBuilder));
        const promisesResult: any[] = await Promise.all(promises);
        _.deepMerge(result, ...promisesResult);
    }

    return result;
}

export async function startSynchronization(d2: D2, builder: SynchronizationBuilder): Promise<void> {
    const fetchPromises = _.keys(builder.metadata)
        .map(type => {
            const myClass = d2ModelFactory(d2, type);
            return {
                type,
                ids: builder.metadata[type],
                excludeRules: myClass.getExcludeRules(),
                includeRules: myClass.getIncludeRules(),
            };
        })
        .map(newBuilder => fetchMetadata(d2, newBuilder));
    await Promise.all(fetchPromises);
}
