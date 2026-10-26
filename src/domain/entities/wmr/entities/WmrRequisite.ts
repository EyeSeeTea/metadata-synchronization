import { Id } from "../../../common/entities/Schemas";

export const wmrRequisiteTypes = ["metadata", "dataStore", "countryFormMonthly", "regionalMonthlyStaging"] as const;
export type WmrRequisiteType = typeof wmrRequisiteTypes[number];

export type WmrRequisite = Readonly<{
    kind: "metadata" | "dataStore";
    code: string;
    assetPath: string;
    assignToCountry: boolean;
}>;

export const wmrRequisites: Readonly<Record<WmrRequisiteType, WmrRequisite>> = {
    metadata: {
        kind: "metadata",
        code: "MAL_WMR_COUNTRY_SYNC",
        assetPath: "wmr/metadata.json",
        assignToCountry: true,
    },
    dataStore: {
        kind: "dataStore",
        code: "MAL_WMR_COUNTRY_SYNC",
        assetPath: "wmr/dataStore.json",
        assignToCountry: false,
    },
    countryFormMonthly: {
        kind: "metadata",
        code: "AFR_COUNTRY_MONTHLY",
        assetPath: "wmr/country-form-monthly.json",
        assignToCountry: false,
    },
    regionalMonthlyStaging: {
        kind: "metadata",
        code: "MAL_WMR_REGIONAL_MONTHLY_SYNC",
        assetPath: "",
        assignToCountry: false,
    },
};

export type WmrRequisiteCheck =
    | Readonly<{ type: "installed" }>
    | Readonly<{ type: "missing" }>
    | Readonly<{ type: "misassigned"; dataSetName: string }>;

export type WmrRequisiteDataSet = Readonly<{ name: string; orgUnitIds: ReadonlyArray<Id> }>;

export function checkWmrRequisiteDataSet(
    dataSet: WmrRequisiteDataSet | undefined,
    countryOrgUnitId: Id,
    requireCountry: boolean
): WmrRequisiteCheck {
    if (!dataSet) return { type: "missing" };
    if (requireCountry && !dataSet.orgUnitIds.includes(countryOrgUnitId)) {
        return { type: "misassigned", dataSetName: dataSet.name };
    }
    return { type: "installed" };
}

export const wmrDestinationCodes = {
    global: wmrRequisites.metadata.code,
    regional: wmrRequisites.regionalMonthlyStaging.code,
} as const;
