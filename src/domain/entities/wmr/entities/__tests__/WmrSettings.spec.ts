import { describe, expect, it } from "vitest";
import { DataSetAttrs, DataSetPeriodType, parseDataSetPeriodType, WmrDestination, WmrSettings } from "../WmrSettings";

function dataSet(id: string, periodType: DataSetPeriodType): DataSetAttrs {
    return { id, name: `Data set ${id}`, periodType, dataElements: [], orgUnits: [] };
}

function destination(id: string, periodType: DataSetPeriodType): WmrDestination {
    return { id, code: `CODE_${id}`, name: `Destination ${id}`, periodType, dataElementsIds: [`${id}-de`] };
}

const yearlySource = dataSet("yearlySource", "Yearly");
const monthlySource = dataSet("monthlySource", "Monthly");
const weeklySource = dataSet("weeklySource", "Weekly");
const yearlyDestination = destination("yearlyDestination", "Yearly");

const settings = new WmrSettings({
    dataSets: [yearlySource, monthlySource, weeklySource, dataSet(yearlyDestination.id, "Yearly")],
    destination: yearlyDestination,
});

describe("WmrSettings", () => {
    describe("getFlowFor", () => {
        it("sends a yearly source to the yearly destination", () => {
            expect(settings.getFlowFor(yearlySource.id)).toEqual({
                source: yearlySource,
                destination: yearlyDestination,
            });
        });

        it("sends a monthly source to the yearly destination", () => {
            expect(settings.getFlowFor(monthlySource.id)).toEqual({
                source: monthlySource,
                destination: yearlyDestination,
            });
        });

        it("has no flow for a source that is neither yearly nor monthly", () => {
            expect(settings.getFlowFor(weeklySource.id)).toBeUndefined();
        });

        it("has no flow for the destination picked as source", () => {
            expect(settings.getFlowFor(yearlyDestination.id)).toBeUndefined();
        });

        it("has no flow for an unknown or empty source", () => {
            expect([settings.getFlowFor("unknown"), settings.getFlowFor(undefined)]).toEqual([undefined, undefined]);
        });

        it("has no flow while the destination is not installed", () => {
            const withoutDestination = new WmrSettings({ dataSets: [yearlySource], destination: undefined });

            expect(withoutDestination.getFlowFor(yearlySource.id)).toBeUndefined();
        });
    });

    describe("getSelectableSources", () => {
        it("lists yearly and monthly sources, excluding the destination", () => {
            expect(settings.getSelectableSources()).toEqual([yearlySource, monthlySource]);
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
