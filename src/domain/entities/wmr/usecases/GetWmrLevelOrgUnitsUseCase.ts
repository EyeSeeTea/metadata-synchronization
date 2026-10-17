import { Future, FutureData } from "../../../common/entities/Future";
import { DynamicRepositoryFactory } from "../../../common/factories/DynamicRepositoryFactory";
import { Instance } from "../../../instance/entities/Instance";
import { buildWmrLevelAssignment, WmrLevelAssignment } from "../entities/WmrOrgUnits";

export class GetWmrLevelOrgUnitsUseCase {
    constructor(private repositoryFactory: DynamicRepositoryFactory, private localInstance: Instance) {}

    execute(level: number): FutureData<WmrLevelAssignment> {
        const repository = this.repositoryFactory.wmrOrgUnitsRepository(this.localInstance);
        return Future.joinObj({
            orgUnits: repository.getLevelOrgUnits(level),
            parentLevelOrgUnits: repository.getLevelOrgUnits(level - 1),
        }).map(({ orgUnits, parentLevelOrgUnits }) => buildWmrLevelAssignment(level, orgUnits, parentLevelOrgUnits));
    }
}
