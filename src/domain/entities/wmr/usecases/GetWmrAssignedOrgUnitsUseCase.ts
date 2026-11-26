import { Maybe } from "../../../../types/utils";
import { Future, FutureData } from "../../../common/entities/Future";
import { DynamicRepositoryFactory } from "../../../common/factories/DynamicRepositoryFactory";
import { Instance } from "../../../instance/entities/Instance";
import { buildWmrLevelAssignment, getSingleLevel, WmrLevelAssignment } from "../entities/WmrOrgUnits";

export class GetWmrAssignedOrgUnitsUseCase {
    constructor(private repositoryFactory: DynamicRepositoryFactory, private localInstance: Instance) {}

    execute(dataSetCode: string): FutureData<Maybe<WmrLevelAssignment>> {
        const repository = this.repositoryFactory.wmrOrgUnitsRepository(this.localInstance);
        return repository.getAssigned(dataSetCode).flatMap(orgUnits => {
            const level = getSingleLevel(orgUnits);
            if (level === undefined) return Future.success(undefined);
            return repository
                .getLevelOrgUnits(level - 1)
                .map(parentLevelOrgUnits => buildWmrLevelAssignment(level, orgUnits, parentLevelOrgUnits));
        });
    }
}
