import { buildSpecificEventsParams, shouldScanStage } from "../EventsD2ApiRepository";

describe("shouldScanStage", () => {
    it("scans when the scan pages cost less than one request per org unit", () => {
        expect(shouldScanStage(250, 5)).toBe(true);
        expect(shouldScanStage(0, 1)).toBe(true);
    });

    it("queries per org unit when the cost is equal or higher", () => {
        expect(shouldScanStage(250, 4)).toBe(false);
        expect(shouldScanStage(251, 8)).toBe(false);
        expect(shouldScanStage(100000, 30)).toBe(false);
    });
});

describe("buildSpecificEventsParams", () => {
    const IDS = ["a", "b"];

    it("uses the legacy params before 2.41", () => {
        expect(buildSpecificEventsParams(40, IDS, "prog", "stage")).toEqual({
            program: "prog",
            programStage: "stage",
            fields: "*",
            event: "a;b",
            skipPaging: true,
        });
    });

    it.each([41, 42])("uses the new params from 2.%i", apiVersion => {
        expect(buildSpecificEventsParams(apiVersion, IDS, "prog", "stage")).toEqual({
            program: "prog",
            programStage: "stage",
            fields: "*",
            events: "a,b",
            paging: false,
        });
    });
});
