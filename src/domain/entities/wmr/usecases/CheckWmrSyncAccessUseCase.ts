import { FutureData } from "../../../common/entities/Future";
import { DynamicRepositoryFactory } from "../../../common/factories/DynamicRepositoryFactory";
import { Instance } from "../../../instance/entities/Instance";
import { WmrNamedOrgUnit } from "../entities/WmrOrgUnits";
import { getWmrSyncAccess, WmrSyncAccess } from "../entities/WmrSyncAccess";

export class CheckWmrSyncAccessUseCase {
    constructor(private repositoryFactory: DynamicRepositoryFactory, private localInstance: Instance) {}

    execute(destinationOrgUnits: ReadonlyArray<WmrNamedOrgUnit>): FutureData<WmrSyncAccess> {
        return this.repositoryFactory
            .wmrSyncAccessRepository(this.localInstance)
            .get()
            .map(info => getWmrSyncAccess(info, destinationOrgUnits));
    }
}
