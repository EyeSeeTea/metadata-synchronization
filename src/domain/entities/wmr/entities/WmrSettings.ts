import { Maybe } from "../../../../types/utils";
import { NamedRef } from "../../../common/entities/Ref";
import { Id } from "../../../common/entities/Schemas";

export const dataSetPeriodTypes = [
    "Daily",
    "Weekly",
    "WeeklyWednesday",
    "WeeklyThursday",
    "WeeklySaturday",
    "WeeklySunday",
    "BiWeekly",
    "Monthly",
    "BiMonthly",
    "Quarterly",
    "QuarterlyNov",
    "SixMonthly",
    "SixMonthlyApril",
    "SixMonthlyNov",
    "Yearly",
    "FinancialApril",
    "FinancialJuly",
    "FinancialOct",
    "FinancialNov",
] as const;
export type DataSetPeriodType = typeof dataSetPeriodTypes[number];

export function parseDataSetPeriodType(value: string): Maybe<DataSetPeriodType> {
    return dataSetPeriodTypes.find(periodType => periodType === value);
}

export type DataSetAttrs = Readonly<
    NamedRef & {
        periodType: DataSetPeriodType;
        dataElements: ReadonlyArray<NamedRef>;
        orgUnits: ReadonlyArray<NamedRef>;
    }
>;

export type WmrDestination = Readonly<{
    id: Id;
    code: string;
    name: string;
    periodType: DataSetPeriodType;
    dataElementsIds: ReadonlyArray<Id>;
}>;

export type WmrSettingsAttrs = Readonly<{
    dataSets: ReadonlyArray<DataSetAttrs>;
    destinations: ReadonlyArray<WmrDestination>;
}>;

export class WmrSettings {
    public readonly dataSets: ReadonlyArray<DataSetAttrs>;
    public readonly destinations: ReadonlyArray<WmrDestination>;
    public static readonly LOCAL_INSTANCE_ID = "LOCAL";

    constructor(attrs: WmrSettingsAttrs) {
        this.dataSets = attrs.dataSets;
        this.destinations = attrs.destinations;
    }

    public getDataElementsIds(dataSetId: Maybe<Id>): Id[] {
        const dataSet = this.dataSets.find(dataSet => dataSet.id === dataSetId);
        return dataSet ? dataSet.dataElements.map(dataElement => dataElement.id) : [];
    }

    public getDestinationFor(sourceDataSetId: Maybe<Id>): Maybe<WmrDestination> {
        const isDestination = this.destinations.some(destination => destination.id === sourceDataSetId);
        const source = this.dataSets.find(dataSet => dataSet.id === sourceDataSetId);
        if (isDestination || !source) return undefined;

        return this.destinations.find(destination => destination.periodType === source.periodType);
    }

    public getSelectableSources(): ReadonlyArray<DataSetAttrs> {
        return this.dataSets.filter(dataSet => this.getDestinationFor(dataSet.id) !== undefined);
    }
}
