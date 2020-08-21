import { DataImportParams } from "../../../types/d2";
import { DataSynchronizationParams } from "../../aggregated/types";
import { Instance } from "../../instance/entities/Instance";
import { SynchronizationResult } from "../../synchronization/entities/SynchronizationResult";
import { ProgramEvent } from "../entities/ProgramEvent";

export interface EventsRepositoryConstructor {
    new (instance: Instance): EventsRepository;
}

export interface EventsRepository {
    getEvents(
        params: DataSynchronizationParams,
        programs?: string[],
        defaults?: string[]
    ): Promise<ProgramEvent[]>;

    save(
        data: object,
        additionalParams: DataImportParams | undefined
    ): Promise<SynchronizationResult>;
}
