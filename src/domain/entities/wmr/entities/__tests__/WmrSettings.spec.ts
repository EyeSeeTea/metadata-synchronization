import { describe, expect, it } from "vitest";
import { DataSetAttrs, DataSetPeriodType, parseDataSetPeriodType, WmrDestination, WmrSettings } from "../WmrSettings";

function dataSet(id: string, periodType: DataSetPeriodType, indicators: DataSetAttrs["indicators"] = []): DataSetAttrs {
    return { id, name: `Data set ${id}`, periodType, dataElements: [], indicators, orgUnits: [] };
}

function destination(id: string, periodType: DataSetPeriodType): WmrDestination {
    return { id, code: `CODE_${id}`, name: `Destination ${id}`, periodType, dataElementsIds: [`${id}-de`] };
}

const malariaDeathsIndicator = { id: "malariaDeathsIndicator", name: "MAL - Malaria deaths (female + male)" };
const malariaCasesIndicator = { id: "malariaCasesIndicator", name: "MAL - Malaria cases" };

const yearlySource = dataSet("yearlySource", "Yearly", [malariaDeathsIndicator, malariaCasesIndicator]);
const monthlySource = dataSet("monthlySource", "Monthly");
const sourceWithDataElements: DataSetAttrs = {
    ...dataSet("sourceWithDataElements", "Yearly", [malariaDeathsIndicator]),
    dataElements: [{ id: "malariaDeathsDataElement", name: "MAL - Malaria deaths" }],
};
const weeklySource = dataSet("weeklySource", "Weekly");
const yearlyDestination = destination("yearlyDestination", "Yearly");
const countryOrgUnit = { id: "ImspTQPwCqd", name: "Sierra Leone", path: "/ImspTQPwCqd" };

const settings = new WmrSettings({
    dataSets: [
        yearlySource,
        monthlySource,
        weeklySource,
        sourceWithDataElements,
        dataSet(yearlyDestination.id, "Yearly"),
    ],
    destination: yearlyDestination,
    countryOrgUnit,
});

describe("WmrSettings", () => {
    describe("getFlowFor", () => {
        it("sends a yearly source to the destination in the global flow", () => {
            expect(settings.getFlowFor(yearlySource.id, "global")).toEqual({
                kind: "global",
                source: yearlySource,
                destination: yearlyDestination,
            });
        });

        it("has no regional flow for a yearly source", () => {
            expect(settings.getFlowFor(yearlySource.id, "regional")).toBeUndefined();
        });

        it("sends a monthly source to the destination in the regional flow", () => {
            expect(settings.getFlowFor(monthlySource.id, "regional")).toEqual({
                kind: "regional",
                source: monthlySource,
                destination: yearlyDestination,
            });
        });

        it("has no global flow for a monthly source", () => {
            expect(settings.getFlowFor(monthlySource.id, "global")).toBeUndefined();
        });

        it("has no flow for a source that is neither yearly nor monthly", () => {
            expect([
                settings.getFlowFor(weeklySource.id, "global"),
                settings.getFlowFor(weeklySource.id, "regional"),
            ]).toEqual([undefined, undefined]);
        });

        it("has no flow for the destination picked as source", () => {
            expect(settings.getFlowFor(yearlyDestination.id, "global")).toBeUndefined();
        });

        it("has no flow for an unknown or empty source", () => {
            expect([settings.getFlowFor("unknown", "global"), settings.getFlowFor(undefined, "global")]).toEqual([
                undefined,
                undefined,
            ]);
        });

        it("has no flow while the destination is not installed", () => {
            const withoutDestination = new WmrSettings({
                dataSets: [yearlySource],
                destination: undefined,
                countryOrgUnit,
            });

            expect(withoutDestination.getFlowFor(yearlySource.id, "global")).toBeUndefined();
        });
    });

    describe("getIndicatorsIds", () => {
        it("returns the ids of the indicators assigned to the source", () => {
            expect(settings.getIndicatorsIds(yearlySource.id)).toEqual([
                malariaDeathsIndicator.id,
                malariaCasesIndicator.id,
            ]);
        });

        it("returns no ids for a source without indicators", () => {
            expect(settings.getIndicatorsIds(monthlySource.id)).toEqual([]);
        });

        it("returns no ids for an unknown or empty source", () => {
            expect([settings.getIndicatorsIds("unknown"), settings.getIndicatorsIds(undefined)]).toEqual([[], []]);
        });
    });

    describe("getSourceMetadataIds", () => {
        it("returns the data elements and then the indicators of the source", () => {
            expect(settings.getSourceMetadataIds(sourceWithDataElements.id)).toEqual([
                "malariaDeathsDataElement",
                malariaDeathsIndicator.id,
            ]);
        });

        it("returns no ids for an unknown source", () => {
            expect(settings.getSourceMetadataIds("unknown")).toEqual([]);
        });
    });

    describe("getSelectableSources", () => {
        it("lists the yearly sources for the global flow, excluding the destination", () => {
            expect(settings.getSelectableSources("global")).toEqual([yearlySource, sourceWithDataElements]);
        });

        it("lists the monthly sources for the regional flow", () => {
            expect(settings.getSelectableSources("regional")).toEqual([monthlySource]);
        });
    });
});

describe("parseDataSetPeriodType", () => {
    it("accepts a DHIS2 period type", () => {
        expect(parseDataSetPeriodType("Monthly")).toBe("Monthly");
    });

    it("rejects an unknown period type", () => {
        expect(parseDataSetPeriodType("Fortnightly")).toBeUndefined();
    });
});
