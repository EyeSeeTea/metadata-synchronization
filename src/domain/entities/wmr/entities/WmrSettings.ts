import { Maybe } from "../../../../types/utils";
import { NamedRef } from "../../../common/entities/Ref";
import { Id } from "../../../common/entities/Schemas";
import { isWmrSourcePeriodType, WmrSourcePeriodType } from "./WmrSyncFlow";

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

export type WmrFlowSource = DataSetAttrs & Readonly<{ periodType: WmrSourcePeriodType }>;

export type WmrFlow = Readonly<{
    source: WmrFlowSource;
    destination: WmrDestination;
}>;

export type WmrSettingsAttrs = Readonly<{
    dataSets: ReadonlyArray<DataSetAttrs>;
    destination: Maybe<WmrDestination>;
}>;

export class WmrSettings {
    public readonly dataSets: ReadonlyArray<DataSetAttrs>;
    public readonly destination: Maybe<WmrDestination>;
    public static readonly LOCAL_INSTANCE_ID = "LOCAL";

    constructor(attrs: WmrSettingsAttrs) {
        this.dataSets = attrs.dataSets;
        this.destination = attrs.destination;
    }

    public getDataElementsIds(dataSetId: Maybe<Id>): Id[] {
        const dataSet = this.dataSets.find(dataSet => dataSet.id === dataSetId);
        return dataSet ? dataSet.dataElements.map(dataElement => dataElement.id) : [];
    }

    public getFlowFor(sourceDataSetId: Maybe<Id>): Maybe<WmrFlow> {
        const { destination } = this;
        const source = this.getSelectableSources().find(dataSet => dataSet.id === sourceDataSetId);
        return destination && source ? { source, destination } : undefined;
    }

    public getSelectableSources(): ReadonlyArray<WmrFlowSource> {
        const destinationId = this.destination?.id;
        return this.dataSets.flatMap(dataSet =>
            dataSet.id !== destinationId && isWmrSourcePeriodType(dataSet.periodType)
                ? [{ ...dataSet, periodType: dataSet.periodType }]
                : []
        );
    }
}
