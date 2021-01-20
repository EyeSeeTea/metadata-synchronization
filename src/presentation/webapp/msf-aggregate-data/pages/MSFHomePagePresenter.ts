import _ from "lodash";
import moment from "moment";
import { buildPeriodFromParams } from "../../../../domain/aggregated/utils";
import { Period } from "../../../../domain/common/entities/Period";
import { PublicInstance } from "../../../../domain/instance/entities/Instance";
import { SynchronizationRule } from "../../../../domain/rules/entities/SynchronizationRule";
import { Store } from "../../../../domain/stores/entities/Store";
import { SynchronizationBuilder } from "../../../../domain/synchronization/entities/SynchronizationBuilder";
import { SynchronizationType } from "../../../../domain/synchronization/entities/SynchronizationType";
import i18n from "../../../../locales";
import { executeAnalytics } from "../../../../utils/analytics";
import { promiseMap } from "../../../../utils/common";
import { formatDateLong } from "../../../../utils/date";
import { availablePeriods } from "../../../../utils/synchronization";
import { CompositionRoot } from "../../../CompositionRoot";
import { AdvancedSettings } from "../../../react/msf-aggregate-data/components/advanced-settings-dialog/AdvancedSettingsDialog";
import { MSFSettings } from "../../../react/msf-aggregate-data/components/msf-settings-dialog/MSFSettingsDialog";

//TODO: maybe convert to class and presenter to use MVP, MVI or BLoC pattern
export async function executeAggregateData(
    compositionRoot: CompositionRoot,
    advancedSettings: AdvancedSettings,
    msfSettings: MSFSettings,
    onProgressChange: (progress: string[]) => void,
    onValidationError: (errors: string[]) => void
) {
    let syncProgress: string[] = [];

    const addEventToProgress = (event: string) => {
        const lastEvent = syncProgress[syncProgress.length - 1];

        if (lastEvent !== event) {
            syncProgress = [...syncProgress, event];
            onProgressChange(syncProgress);
        }
    };

    const eventSyncRules = await getSyncRules(compositionRoot, advancedSettings, msfSettings);

    const validationErrors = msfSettings.checkInPreviousPeriods
        ? await validatePreviousDataValues(
              compositionRoot,
              eventSyncRules,
              msfSettings,
              addEventToProgress
          )
        : [];

    if (validationErrors.length > 0) {
        onValidationError(validationErrors);
    } else {
        addEventToProgress(i18n.t(`Starting Aggregate Data...`));

        if (isGlobalInstance && msfSettings.runAnalytics === "false") {
            const lastExecution = await getLastAnalyticsExecution(compositionRoot);

            addEventToProgress(
                i18n.t("Run analytics is disabled, last analytics execution: {{lastExecution}}", {
                    lastExecution,
                    nsSeparator: false,
                })
            );
        }
        if (msfSettings.deleteDataValuesBeforeSync && !msfSettings.dataElementGroupId) {
            addEventToProgress(
                i18n.t(
                    `Deleting previous data values is not possible because data element group is not defined, please contact with your administrator`
                )
            );
        }

        const runAnalyticsIsRequired =
            msfSettings.runAnalytics === "by-sync-rule-settings"
                ? eventSyncRules.some(rule => rule.builder.dataParams?.runAnalytics ?? false)
                : msfSettings.runAnalytics === "true";

        const rulesWithoutRunAnalylics = eventSyncRules.map(rule =>
            rule.updateBuilderDataParams({ ...rule.builder.dataParams, runAnalytics: false })
        );

        if (runAnalyticsIsRequired) {
            await runAnalytics(compositionRoot, addEventToProgress, msfSettings.analyticsYears);
        }

        for (const syncRule of rulesWithoutRunAnalylics) {
            await executeSyncRule(compositionRoot, syncRule, addEventToProgress, msfSettings);
        }

        addEventToProgress(i18n.t(`Finished Aggregate Data`));
    }
}

export function isGlobalInstance(): boolean {
    return !window.location.host.includes("localhost");
}

async function validatePreviousDataValues(
    compositionRoot: CompositionRoot,
    syncRules: SynchronizationRule[],
    msfSettings: MSFSettings,
    addEventToProgress: (event: string) => void
): Promise<string[]> {
    addEventToProgress(i18n.t(`Checking data values in previous periods ....`));

    const validationsErrors = await promiseMap(syncRules, async rule => {
        const targetInstances = await compositionRoot.instances.list({ ids: rule.targetInstances });

        const byInstance = await promiseMap(targetInstances, async instance => {
            if (!rule.dataParams || !rule.dataParams.period || !msfSettings.dataElementGroupId)
                return undefined;

            const { startDate } = buildPeriodFromParams(rule.dataParams);
            const endDate = startDate.clone().subtract(1, "day");

            const { dataValues = [] } = await compositionRoot.aggregated.list(
                instance,
                {
                    orgUnitPaths: rule.builder.dataParams?.orgUnitPaths ?? [],
                    startDate: moment("1970-01-01").toDate(),
                    endDate: endDate.toDate(),
                    lastUpdated: startDate.toDate(),
                },
                msfSettings.dataElementGroupId
            );

            if (dataValues.length > 0) {
                const periodName = availablePeriods[rule.dataParams.period].name;

                return `Sync rule '${rule.name}': there are data values in '${
                    instance.name
                }' for previous period to '${periodName}' and updated after '${startDate.format(
                    "YYYY-MM-DD"
                )}'`;
            } else {
                return undefined;
            }
        });

        return _.compact(byInstance);
    });

    return _.compact(validationsErrors).flat();
}

async function executeSyncRule(
    compositionRoot: CompositionRoot,
    rule: SynchronizationRule,
    addEventToProgress: (event: string) => void,
    msfSettings: MSFSettings
): Promise<void> {
    const { name, builder, id: syncRule, type = "metadata", targetInstances } = rule;

    addEventToProgress(i18n.t(`Starting Sync Rule {{name}} ...`, { name }));

    if (msfSettings.deleteDataValuesBeforeSync && msfSettings.dataElementGroupId) {
        await deletePreviousDataValues(
            compositionRoot,
            targetInstances,
            builder,
            msfSettings,
            addEventToProgress
        );
    }

    const sync = compositionRoot.sync[type]({ ...builder, syncRule });

    for await (const { message, syncReport, done } of sync.execute()) {
        if (message) addEventToProgress(message);
        if (syncReport) await compositionRoot.reports.save(syncReport);

        if (done && syncReport) {
            addEventToProgress(`${i18n.t("Summary of Sync Rule")}:`);
            syncReport.getResults().forEach(result => {
                addEventToProgress(
                    `${i18n.t("Type")}: ${getTypeName(result.type, syncReport.type)}`
                );

                const origin = result.origin
                    ? `${i18n.t("Origin")}: ${getOriginName(result.origin)} `
                    : "";
                const originPackage = result.originPackage
                    ? `${i18n.t("Origin package")}: ${result.originPackage.name}`
                    : "";
                const destination = `${i18n.t("Destination")}: ${result.instance.name}`;
                addEventToProgress(`${origin} ${originPackage} -> ${destination}`);

                const status = `${i18n.t("Status")}: ${_.startCase(_.toLower(result.status))}`;
                const message = result.message ?? "";
                addEventToProgress(`${status} - ${message}`);

                result.errors?.forEach(error => {
                    addEventToProgress(error.message);
                });
            });
            addEventToProgress(i18n.t(`Finished Sync Rule {{name}}`, { name }));
        } else if (done) {
            addEventToProgress(i18n.t(`Finished Sync Rule {{name}} with errors`, { name }));
        }
    }
}

const getTypeName = (reportType: SynchronizationType, syncType: string) => {
    switch (reportType) {
        case "aggregated":
            return syncType === "events" ? i18n.t("Program Indicators") : i18n.t("Aggregated");
        case "events":
            return i18n.t("Events");
        case "metadata":
            return i18n.t("Metadata");
        case "deleted":
            return i18n.t("Deleted");
        default:
            return i18n.t("Unknown");
    }
};

async function getSyncRules(
    compositionRoot: CompositionRoot,
    advancedSettings: AdvancedSettings,
    msfSettings: MSFSettings
): Promise<SynchronizationRule[]> {
    const { period: overridePeriod } = advancedSettings;
    const { projectMinimumDates } = msfSettings;
    const { dataViewOrganisationUnits } = await compositionRoot.instances.getCurrentUser();

    const { rows } = await compositionRoot.rules.list({ paging: false });
    const allRules = await promiseMap(rows, ({ id }) => compositionRoot.rules.get(id));

    return _(allRules)
        .map(rule => {
            // Remove rules that are not aggregated or events
            if (!rule || !["events", "aggregated"].includes(rule.type)) return undefined;

            const paths = rule.dataSyncOrgUnitPaths.filter(path =>
                _.some(dataViewOrganisationUnits, ({ id }) => path.includes(id))
            );

            // Filter organisation units to user visibility
            return paths.length > 0 ? rule?.updateDataSyncOrgUnitPaths(paths) : undefined;
        })
        .compact()
        .map(rule => {
            // Update period and dates according to settings
            return !overridePeriod
                ? rule
                : rule.updateBuilderDataParams({
                      period: overridePeriod.type,
                      startDate: overridePeriod.startDate,
                      endDate: overridePeriod.endDate,
                  });
        })
        .map(rule => {
            const { endDate } = buildPeriodFromParams(rule.dataParams);

            // Remove org units with minimum date after end date
            return rule.updateDataSyncOrgUnitPaths(
                rule.dataSyncOrgUnitPaths.filter(path => {
                    const { date } = projectMinimumDates[path] ?? {};
                    return !date || moment(date).isSameOrBefore(endDate);
                })
            );
        })
        .flatMap(rule => {
            const { startDate, endDate } = buildPeriodFromParams(rule.dataParams);

            return _(rule.dataSyncOrgUnitPaths)
                .groupBy(path =>
                    projectMinimumDates[path]?.date
                        ? moment(projectMinimumDates[path].date).format("YYYY-MM-DD")
                        : undefined
                )
                .toPairs()
                .map(([date, paths]) => {
                    // Keep original dates but update org unit paths if is before current date
                    if (date === "undefined" || moment(date).isSameOrBefore(startDate)) {
                        return rule.updateDataSyncOrgUnitPaths(paths);
                    }

                    // Update start date if minimum date is after current one
                    return rule.updateDataSyncOrgUnitPaths(paths).updateBuilderDataParams({
                        period: "FIXED",
                        startDate: new Date(date),
                        endDate: endDate.toDate(),
                    });
                })
                .value();
        })
        .filter(rule => rule.dataSyncOrgUnitPaths.length > 0)
        .value();
}

async function runAnalytics(
    compositionRoot: CompositionRoot,
    addEventToProgress: (event: string) => void,
    lastYears: number
) {
    const localInstance = await compositionRoot.instances.getLocal();

    for await (const message of executeAnalytics(localInstance, { lastYears })) {
        addEventToProgress(message);
    }

    addEventToProgress(i18n.t("Analytics execution finished on {{name}}", localInstance));
}

async function getLastAnalyticsExecution(compositionRoot: CompositionRoot): Promise<string> {
    const systemInfo = await compositionRoot.systemInfo.get();

    return systemInfo.lastAnalyticsTableSuccess
        ? formatDateLong(systemInfo.lastAnalyticsTableSuccess)
        : i18n.t("never");
}

const getOriginName = (source: PublicInstance | Store) => {
    if ((source as Store).token) {
        const store = source as Store;
        return store.account + " - " + store.repository;
    } else {
        const instance = source as PublicInstance;
        return instance.name;
    }
};
async function deletePreviousDataValues(
    compositionRoot: CompositionRoot,
    targetInstances: string[],
    newBuilder: SynchronizationBuilder,
    msfSettings: MSFSettings,
    addEventToProgress: (event: string) => void
) {
    const getPeriodText = (period: Period) => {
        const formatDate = (date?: Date) => moment(date).format("YYYY-MM-DD");

        return `${availablePeriods[period.type].name} ${
            period.type === "FIXED"
                ? `- start: ${formatDate(period.startDate)} - end: ${formatDate(period.endDate)}`
                : ""
        }`;
    };

    for (const instanceId of targetInstances) {
        const instanceResult = await compositionRoot.instances.getById(instanceId);

        instanceResult.match({
            error: () =>
                addEventToProgress(
                    i18n.t(`Error retrieving instance {{name}} to delete previoud data values`, {
                        name: instanceId,
                    })
                ),
            success: instance => {
                if (newBuilder.dataParams?.period) {
                    const periodResult = Period.create({
                        type: newBuilder.dataParams.period,
                        startDate: newBuilder.dataParams.startDate,
                        endDate: newBuilder.dataParams.endDate,
                    });

                    periodResult.match({
                        error: () => addEventToProgress(i18n.t(`Error creating period`)),
                        success: period => {
                            if (msfSettings.dataElementGroupId) {
                                const periodText = getPeriodText(period);

                                addEventToProgress(
                                    i18n.t(
                                        `Deleting previous data values in target instance {{name}} for period {{period}}...`,
                                        { name: instance.name, period: periodText }
                                    )
                                );

                                compositionRoot.aggregated.delete(
                                    newBuilder.dataParams?.orgUnitPaths ?? [],
                                    msfSettings.dataElementGroupId,
                                    period,
                                    instance
                                );
                            }
                        },
                    });
                } else {
                    const periodText = getPeriodText(Period.createDefault());
                    addEventToProgress(
                        i18n.t(
                            `Deleting previous data values for period {{period}} is not possible`,
                            { period: periodText }
                        )
                    );
                }
            },
        });
    }
}
