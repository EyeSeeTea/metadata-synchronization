export const wmrRequisiteTypes = ["metadata", "dataStore"] as const;
export type WmrRequisiteType = typeof wmrRequisiteTypes[number];

export type WmrRequisite = Readonly<{
    kind: "metadata" | "dataStore";
    code: string;
    assetPath: string;
}>;

export const wmrRequisites: Readonly<Record<WmrRequisiteType, WmrRequisite>> = {
    metadata: { kind: "metadata", code: "MAL_WMR_COUNTRY_SYNC", assetPath: "wmr/metadata.json" },
    dataStore: { kind: "dataStore", code: "MAL_WMR_COUNTRY_SYNC", assetPath: "wmr/dataStore.json" },
};

export type WmrRequisiteCheck =
    | Readonly<{ type: "installed" }>
    | Readonly<{ type: "missing" }>
    | Readonly<{ type: "misassigned"; dataSetName: string; orgUnitsCount: number }>;

export type WmrRequisiteDataSet = Readonly<{ name: string; orgUnitsCount: number }>;

export function checkWmrRequisiteDataSet(dataSet: WmrRequisiteDataSet | undefined): WmrRequisiteCheck {
    if (!dataSet) return { type: "missing" };
    if (dataSet.orgUnitsCount > 1) {
        return { type: "misassigned", dataSetName: dataSet.name, orgUnitsCount: dataSet.orgUnitsCount };
    }
    return { type: "installed" };
}

export const wmrDestinationCode = wmrRequisites.metadata.code;
