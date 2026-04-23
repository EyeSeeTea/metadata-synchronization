import { ObjectWithPeriod } from "../../../react/core/components/period-selection/PeriodSelection";
import { NamedDate } from "../../../react/msf-aggregate-data/components/org-unit-date-selector/OrgUnitDateSelector";

export type RunAnalyticsSettings = "true" | "false" | "by-sync-rule-settings";

export type AnalyticsOptions = {
    lastYears: number;
    skipAggregate: boolean;
    skipResourceTables: boolean;
    skipEvents: boolean;
    skipEnrollment: boolean;
    skipOrgUnitOwnership: boolean;
    skipTrackedEntities: boolean;
    skipOutliers: boolean;
};

export type MSFSettings = {
    runAnalyticsBefore: RunAnalyticsSettings;
    runAnalyticsAfter: RunAnalyticsSettings;
    analyticsBefore?: AnalyticsOptions;
    analyticsAfter?: AnalyticsOptions;
    projectMinimumDates: Record<string, NamedDate>;
    deleteDataValuesBeforeSync?: boolean;
    checkInPreviousPeriods?: boolean;
    lastExecutions: Record<string, Date>;
};

export type AdvancedSettings = {
    period?: ObjectWithPeriod;
};

export const MSFStorageKey = "msf-storage";

export const defaultAnalyticsOptions: AnalyticsOptions = {
    lastYears: 2,
    skipAggregate: false,
    skipResourceTables: false,
    skipEvents: false,
    skipEnrollment: false,
    skipOrgUnitOwnership: false,
    skipTrackedEntities: false,
    skipOutliers: false,
};

export const defaultMSFSettings: MSFSettings = {
    runAnalyticsBefore: "by-sync-rule-settings",
    runAnalyticsAfter: "by-sync-rule-settings",
    projectMinimumDates: {},
    deleteDataValuesBeforeSync: false,
    checkInPreviousPeriods: false,
    lastExecutions: {},
};

export type StoredMSFSettings = Partial<MSFSettings> & { analyticsYears?: number };

export function buildMSFSettings(raw: StoredMSFSettings | undefined | null): MSFSettings {
    const { analyticsYears, analyticsBefore, analyticsAfter, ...rest } = raw ?? {};
    const legacyPanel: AnalyticsOptions | undefined =
        analyticsYears !== undefined ? { ...defaultAnalyticsOptions, lastYears: analyticsYears } : undefined;

    return {
        ...defaultMSFSettings,
        ...rest,
        analyticsBefore: analyticsBefore ?? legacyPanel,
        analyticsAfter: analyticsAfter ?? legacyPanel,
    };
}
