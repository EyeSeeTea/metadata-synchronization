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
const monthlyDestination = destination("monthlyDestination", "Monthly");

const settings = new WmrSettings({
    dataSets: [yearlySource, monthlySource, weeklySource, dataSet(yearlyDestination.id, "Yearly")],
    destinations: [yearlyDestination, monthlyDestination],
});

describe("WmrSettings", () => {
    describe("getDestinationFor", () => {
        it("pairs a yearly source with the yearly destination", () => {
            expect(settings.getDestinationFor(yearlySource.id)).toEqual(yearlyDestination);
        });

        it("pairs a monthly source with the monthly destination", () => {
            expect(settings.getDestinationFor(monthlySource.id)).toEqual(monthlyDestination);
        });

        it("returns undefined when no destination shares the source period type", () => {
            expect(settings.getDestinationFor(weeklySource.id)).toBeUndefined();
        });

        it("returns undefined for a destination picked as source", () => {
            expect(settings.getDestinationFor(yearlyDestination.id)).toBeUndefined();
        });

        it("returns undefined for an unknown or empty source", () => {
            expect(settings.getDestinationFor("unknown")).toBeUndefined();
            expect(settings.getDestinationFor(undefined)).toBeUndefined();
        });
    });

    describe("getSelectableSources", () => {
        it("lists only sources with a destination, excluding the destinations themselves", () => {
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
