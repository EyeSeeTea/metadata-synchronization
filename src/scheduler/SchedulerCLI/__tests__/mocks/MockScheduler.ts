import { ScheduledJob, DEFAULT_SCHEDULED_JOB_ID } from "../../../../domain/scheduler/entities/ScheduledJob";
import { SchedulerContract } from "../../SchedulerContract";

export class MockScheduler implements SchedulerContract {
    private jobs: { job: ScheduledJob; callback: () => Promise<void> }[] = [];

    getScheduledJobs(): ScheduledJob[] {
        return this.jobs.map(({ job }) => job);
    }

    async runScheduledJob(id: string): Promise<void> {
        const scheduledJob = this.jobs.find(({ job }) => job.id === id);
        if (!scheduledJob) throw new Error(`No scheduled job with id ${id}`);

        await scheduledJob.callback();
    }

    scheduleJob(options: { jobId?: string; frequency?: string; jobCallback: () => Promise<void> }): ScheduledJob {
        const { jobId = DEFAULT_SCHEDULED_JOB_ID } = options;

        const job: ScheduledJob = {
            id: jobId,
            nextExecution: new Date(),
        };

        this.jobs = [...this.jobs, { job, callback: options.jobCallback }];
        return job;
    }

    cancelJob(id: string): void {
        this.jobs = this.jobs.filter(({ job }) => job.id !== id);
    }
}
