import { DataImportParams, DataSynchronizationParams } from "../../aggregated/entities/DataSynchronizationParams";
import { SynchronizationResult } from "../../reports/entities/SynchronizationResult";
import { EventsPackage } from "../entities/EventsPackage";
import { ProgramEvent } from "../entities/ProgramEvent";
import { ProgramStageRef } from "../mapper/Models";

export interface EventsRepository {
    getEvents(
        params: DataSynchronizationParams,
        programStages?: ProgramStageRef[],
        defaults?: string[]
    ): Promise<ProgramEvent[]>;

    save(data: EventsPackage, additionalParams: DataImportParams | undefined): Promise<SynchronizationResult>;

    getEventFile(eventId: string, dataElement: string, fileResourceId: string): Promise<File>;
}
