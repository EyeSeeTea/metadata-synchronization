import { buildMSFSettings, defaultAnalyticsAfter, defaultAnalyticsBefore } from "../MSFEntities";

describe("buildMSFSettings", () => {
    it("uses the default analytics options of each panel when nothing is stored", () => {
        const settings = buildMSFSettings(undefined);

        expect(settings.analyticsBefore).toEqual(defaultAnalyticsBefore);
        expect(settings.analyticsAfter).toEqual(defaultAnalyticsAfter);
    });

    it("skips by default the flags that were not shown in each panel for settings stored before", () => {
        const settings = buildMSFSettings({
            analyticsBefore: { lastYears: 3, skipResourceTables: true, skipTrackedEntities: false },
            analyticsAfter: { lastYears: 1, skipAggregate: true, skipOutliers: false },
        });

        expect(settings.analyticsBefore).toEqual({
            lastYears: 3,
            skipResourceTables: true,
            skipTrackedEntities: false,
            skipAggregate: true,
            skipOutliers: true,
        });
        expect(settings.analyticsAfter).toEqual({
            lastYears: 1,
            skipAggregate: true,
            skipOutliers: false,
            skipEvents: true,
            skipEnrollment: true,
            skipOrgUnitOwnership: true,
            skipTrackedEntities: true,
        });
    });

    it("keeps flags explicitly disabled by the user", () => {
        const settings = buildMSFSettings({
            analyticsBefore: { lastYears: 2, skipAggregate: false, skipOutliers: false },
        });

        expect(settings.analyticsBefore.skipAggregate).toBe(false);
        expect(settings.analyticsBefore.skipOutliers).toBe(false);
    });

    it("migrates legacy analyticsYears to both panels", () => {
        const settings = buildMSFSettings({ analyticsYears: 5 });

        expect(settings.analyticsBefore).toEqual({ ...defaultAnalyticsBefore, lastYears: 5 });
        expect(settings.analyticsAfter).toEqual({ ...defaultAnalyticsAfter, lastYears: 5 });
    });
});
