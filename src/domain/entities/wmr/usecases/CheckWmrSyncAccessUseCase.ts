import { FutureData } from "../../../common/entities/Future";
import { DynamicRepositoryFactory } from "../../../common/factories/DynamicRepositoryFactory";
import { Instance } from "../../../instance/entities/Instance";
import { WmrFlowKind } from "../entities/WmrFlowKind";
import { WmrNamedOrgUnit } from "../entities/WmrOrgUnits";
import { getWmrSyncAccess, WmrSyncAccess } from "../entities/WmrSyncAccess";

export class CheckWmrSyncAccessUseCase {
    constructor(private repositoryFactory: DynamicRepositoryFactory, private localInstance: Instance) {}

    execute(flowKind: WmrFlowKind, destinationOrgUnits: ReadonlyArray<WmrNamedOrgUnit>): FutureData<WmrSyncAccess> {
        return this.repositoryFactory
            .wmrSyncAccessRepository(this.localInstance)
            .get(flowKind)
            .map(info => getWmrSyncAccess(info, destinationOrgUnits));
    }
}
