import { Maybe } from "../../../../types/utils";
import { NamedRef } from "../../../common/entities/Ref";
import { Id } from "../../../common/entities/Schemas";
import { WmrFlowKind, wmrFlowDefinitions } from "./WmrFlowKind";
import { WmrNamedOrgUnit } from "./WmrOrgUnits";
import { WmrSourcePeriodType } from "./WmrSyncFlow";

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
        indicators: ReadonlyArray<NamedRef>;
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
    kind: WmrFlowKind;
    source: WmrFlowSource;
    destination: WmrDestination;
}>;

export type WmrSettingsAttrs = Readonly<{
    dataSets: ReadonlyArray<DataSetAttrs>;
    destination: Maybe<WmrDestination>;
    countryOrgUnit: WmrNamedOrgUnit;
}>;

export class WmrSettings {
    public readonly dataSets: ReadonlyArray<DataSetAttrs>;
    public readonly destination: Maybe<WmrDestination>;
    public readonly countryOrgUnit: WmrNamedOrgUnit;
    public static readonly LOCAL_INSTANCE_ID = "LOCAL";

    constructor(attrs: WmrSettingsAttrs) {
        this.dataSets = attrs.dataSets;
        this.destination = attrs.destination;
        this.countryOrgUnit = attrs.countryOrgUnit;
    }

    public getDataElementsIds(dataSetId: Maybe<Id>): Id[] {
        return this.getDataSet(dataSetId)?.dataElements.map(dataElement => dataElement.id) ?? [];
    }

    public getIndicatorsIds(dataSetId: Maybe<Id>): Id[] {
        return this.getDataSet(dataSetId)?.indicators.map(indicator => indicator.id) ?? [];
    }

    public getSourceMetadataIds(dataSetId: Maybe<Id>): Id[] {
        return [...this.getDataElementsIds(dataSetId), ...this.getIndicatorsIds(dataSetId)];
    }

    public getFlowFor(sourceDataSetId: Maybe<Id>, kind: WmrFlowKind): Maybe<WmrFlow> {
        const { destination } = this;
        const source = this.getSelectableSources(kind).find(dataSet => dataSet.id === sourceDataSetId);
        return destination && source ? { kind, source, destination } : undefined;
    }

    public getSelectableSources(kind: WmrFlowKind): ReadonlyArray<WmrFlowSource> {
        const destinationId = this.destination?.id;
        const { sourcePeriodType } = wmrFlowDefinitions[kind];
        return this.dataSets.flatMap(dataSet =>
            dataSet.id !== destinationId && dataSet.periodType === sourcePeriodType
                ? [{ ...dataSet, periodType: sourcePeriodType }]
                : []
        );
    }

    private getDataSet(dataSetId: Maybe<Id>): Maybe<DataSetAttrs> {
        return this.dataSets.find(dataSet => dataSet.id === dataSetId);
    }
}
