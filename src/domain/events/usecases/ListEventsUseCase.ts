import { DataSynchronizationParams } from "../../aggregated/entities/DataSynchronizationParams";
import { UseCase } from "../../common/entities/UseCase";
import { DynamicRepositoryFactory } from "../../common/factories/DynamicRepositoryFactory";
import { Instance } from "../../instance/entities/Instance";
import { ProgramEvent } from "../entities/ProgramEvent";
import { ProgramStageRef } from "../mapper/Models";

export class ListEventsUseCase implements UseCase {
    constructor(private repositoryFactory: DynamicRepositoryFactory, protected localInstance: Instance) {}

    public async execute(
        instance: Instance,
        params: DataSynchronizationParams,
        programStages: ProgramStageRef[] = [],
        defaults: string[] = []
    ): Promise<ProgramEvent[]> {
        return this.repositoryFactory.eventsRepository(instance).getEvents(params, programStages, defaults);
    }
}
