import _ from "lodash";
import {cleanOptions, d2BaseModelColumns, d2BaseModelDetails} from "../utils/d2";
import { TableFilters, TableLabel, TableList, TablePagination } from "../types/d2-ui-components";
import { D2, ModelDefinition } from "../types/d2";

export abstract class D2Model {
    // Metadata Type should be defined on subclasses
    protected static metadataType: string;
    protected static excludeRules: string[] = [];
    protected static includeRules: string[] = [];

    // Other static properties can be optionally overridden on subclasses
    protected static columns = d2BaseModelColumns;
    protected static details = d2BaseModelDetails;
    protected static initialSorting = ["name", "asc"];

    // List method should be executed by a wrapper to preserve static context binding
    public static async listMethod(
        d2: D2,
        filters: TableFilters,
        pagination: TablePagination
    ): Promise<TableList> {
        const { search = null } = filters || {};
        const { page = 1, pageSize = 20, sorting = this.initialSorting } = pagination || {};
        const fields = this.details.map(e => e.name);

        const [field, direction] = sorting;
        const order = `${field}:i${direction}`;
        const filter = _.compact([search ? `displayName:ilike:${search}` : null]);

        const listOptions = cleanOptions({ fields, filter, page, pageSize, order });
        const collection = await this.getD2Model(d2).list(listOptions);
        return { pager: collection.pager, objects: collection.toArray() };
    }

    public static getD2Model(d2: D2): ModelDefinition {
        return d2.models[this.metadataType];
    }

    public static getMetadataType(): string {
        return this.metadataType;
    }

    public static getExcludeRules(): string[] {
        return this.excludeRules;
    }

    public static getIncludeRules(): string[] {
        return this.includeRules;
    }

    public static getColumns(): TableLabel[] {
        return this.columns;
    }

    public static getDetails(): TableLabel[] {
        return this.details;
    }

    public static getInitialSorting(): string[] {
        return this.initialSorting;
    }
}

export class OrganisationUnitModel extends D2Model {
    protected static metadataType = "organisationUnit";
    protected static excludeRules = [
        "legendSets",
        "dataSets",
        "user",
        "userGroups",
        "organisationUnitGroups.userGroups",
    ];
    protected static includeRules = [
        "attributes",
        "organisationUnitGroups",
        "organisationUnitGroups.attributes",
        "organisationUnitGroups.organisationUnitGroupSets",
        "organisationUnitGroups.organisationUnitGroupSets.attributes",
    ];
}

export class DataElementModel extends D2Model {
    protected static metadataType = "dataElement";
}

export class IndicatorModel extends D2Model {
    protected static metadataType = "indicator";
}

export class ValidationRuleModel extends D2Model {
    protected static metadataType = "validationRule";
}

export function defaultModel(pascalCaseModelName: string): any {
    return class DefaultModel extends D2Model {
        protected static metadataType = pascalCaseModelName;
    };
}
