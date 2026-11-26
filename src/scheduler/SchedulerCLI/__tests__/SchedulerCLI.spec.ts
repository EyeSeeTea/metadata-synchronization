import { Either } from "../../../domain/common/entities/Either";
import { FutureData, Future } from "../../../domain/common/entities/Future";
import { SynchronizationRule } from "../../../domain/rules/entities/SynchronizationRule";
import { DEFAULT_SCHEDULED_JOB_ID } from "../../../domain/scheduler/entities/ScheduledJob";
import { ListSyncRuleUseCaseParams } from "../../../domain/rules/usecases/ListSyncRuleUseCase";
import { SchedulerExecutionInfo } from "../../../domain/scheduler/entities/SchedulerExecutionInfo";
import { PrepareSyncError } from "../../../domain/synchronization/usecases/PrepareSyncUseCase";
import { CompositionRoot } from "../../../presentation/CompositionRoot";
import { SchedulerCLI, SyncRuleJobConfig } from "../SchedulerCLI";
import { getSynchronizationRule } from "./data/getSynchronizationRule";
import { MockLogger } from "./mocks/MockLogger";
import { MockScheduler } from "./mocks/MockScheduler";
import { vi } from "vitest";

// TODO: This is the first version of tests, needs a refactor to use ts-mockito instead

const API_PATH = "baseUrl/api/";

describe("SchedulerCLI", () => {
    let schedulerCLI: SchedulerCLI;
    let mockScheduler: MockScheduler;
    let mockCompositionRoot: MockCompositionRoot;
    let mockLogger: MockLogger;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2025-06-12T08:12:50.777Z"));

        vi.clearAllMocks();
        mockScheduler = new MockScheduler();
        mockCompositionRoot = new MockCompositionRoot();
        mockLogger = new MockLogger();

        schedulerCLI = new SchedulerCLI({
            scheduler: mockScheduler,
            compositionRoot: mockCompositionRoot as unknown as CompositionRoot,
            logger: mockLogger,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("keeps scheduled jobs and logs the error message when listing rules fails", async () => {
        schedulerCLI.initialize(API_PATH);

        await mockScheduler.runScheduledJob(DEFAULT_SCHEDULED_JOB_ID);
        const scheduledJobs = mockScheduler.getScheduledJobs();
        expect(scheduledJobs.map(job => job.id)).toContain(getSyncRuleJobConfig().id);

        const error = new Error("DHIS2 unavailable");
        mockCompositionRoot.failNextRuleListing(error);

        await mockScheduler.runScheduledJob(DEFAULT_SCHEDULED_JOB_ID);

        expect(mockScheduler.getScheduledJobs()).toEqual(scheduledJobs);
        expect(mockLogger.errors).toContainEqual({ name: "scheduler", message: error.message });
    });

    describe("initialize", () => {
        it("should fetch tasks, schedule a job and log a message", async () => {
            const spyGetSyncRuleJobConfigs = vi.spyOn(mockCompositionRoot.rules, "list");
            const spyScheduleJob = vi.spyOn(mockScheduler, "scheduleJob");
            const spyLoggerInfo = vi.spyOn(mockLogger, "info");

            schedulerCLI.initialize(API_PATH);

            expect(spyGetSyncRuleJobConfigs).toHaveBeenCalled();
            expect(spyScheduleJob).toHaveBeenCalled();
            expect(spyLoggerInfo).toHaveBeenCalledWith("main", "Loading synchronization rules from remote server");
        });

        it("should call compositionRoot.rules.list with correct params and return correct SyncRuleJobConfig[]", async () => {
            const spyListRules = vi.spyOn(mockCompositionRoot.rules, "list");

            const expectedSyncRules: SynchronizationRule[] = [getSynchronizationRule(true)];

            const result = await schedulerCLI["getEnabledSyncRules"]();

            expect(spyListRules).toHaveBeenCalledWith({
                paging: false,
                filters: {
                    schedulerEnabledFilter: "enabled",
                    schedulerTypeFilter: "metadataSync",
                    allProperties: true,
                },
            });
            expect(result).toEqual(expectedSyncRules);
        });

        it("should call getSyncRuleJobConfigs and return correct SyncRuleJobConfig", async () => {
            const syncRulesEnabled: SynchronizationRule[] = [getSynchronizationRule(true)];
            const expectedSyncRuleJobConfigs: SyncRuleJobConfig[] = [getSyncRuleJobConfig()];

            const result = await schedulerCLI["getSyncRuleJobConfigs"](syncRulesEnabled);

            expect(result).toEqual(expectedSyncRuleJobConfigs);
        });
    });
});

function getSyncRuleJobConfig(): SyncRuleJobConfig {
    return {
        id: "sync-rule-id",
        name: "Sync Rule",
        frequency: "0 */2 * * * *",
        needsUpdateFrequency: false,
    };
}

/**
 * @deprecated this is only a workaround, we need to replace this by a correct implementation of testing CompositionRoot
 */
class MockCompositionRoot {
    private ruleListingError?: Error;

    failNextRuleListing(error: Error): void {
        this.ruleListingError = error;
    }

    rules = {
        get(): Promise<SynchronizationRule | undefined> {
            return Promise.resolve(getSynchronizationRule());
        },

        list: async (params: ListSyncRuleUseCaseParams): Promise<{ rows: SynchronizationRule[] }> => {
            const error = this.ruleListingError;
            this.ruleListingError = undefined;
            if (error) throw error;

            const { schedulerEnabledFilter = null } = params.filters || {};
            const isSchedulerEnabled = schedulerEnabledFilter === "enabled";
            return { rows: [getSynchronizationRule(isSchedulerEnabled)] };
        },
    };

    scheduler = {
        getLastExecutionInfo(): FutureData<SchedulerExecutionInfo> {
            return Future.success({ lastExecution: new Date() });
        },

        updateExecutionInfo(_executionInfo: SchedulerExecutionInfo): FutureData<void> {
            return Future.success(undefined);
        },
    };

    sync = {
        prepare(): Promise<Either<PrepareSyncError, void>> {
            return Promise.resolve(Either.success(undefined));
        },

        metadata() {
            return {
                execute: async function* () {
                    yield { message: "Task started", done: false };
                    yield { message: "Task finished", done: true, syncReport: { id: "report1" } };
                },
            };
        },
    };

    reports = {
        save(): Promise<void> {
            return Promise.resolve();
        },
    };
}
