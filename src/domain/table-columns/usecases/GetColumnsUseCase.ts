import { UseCase } from "../../common/entities/UseCase";
import { RepositoryFactory } from "../../common/factories/RepositoryFactory";
import { Instance } from "../../instance/entities/Instance";
import { TableColumn } from "../entities/TableColumn";

export class GetColumnsUseCase implements UseCase {
    constructor(private repositoryFactory: RepositoryFactory, protected localInstance: Instance) {}

    public async execute(id: string): Promise<TableColumn[]> {
        return this.repositoryFactory.tableColumnsRepository(this.localInstance).getColumns(id);
    }
}
