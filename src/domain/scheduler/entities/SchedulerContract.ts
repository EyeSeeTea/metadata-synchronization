import { ScheduledJob } from "./ScheduledJob";

/**
 * @description This is refactored
 */
export interface SchedulerContract {
    getScheduledJobs(): ScheduledJob[];
    scheduleJob(options: { jobId?: string; frequency?: string; jobCallback: () => Promise<void> }): ScheduledJob;
    cancelJob(id: string): void;
}
