import { FutureData } from "../../common/entities/Future";
import { AttachedFile, AttachedFileInput } from "../entities/AttachedFile";
import { AttachedFileRepository } from "../repositories/AttachedFileRepository";

export class AttachFileUseCase {
    constructor(private repository: AttachedFileRepository) {}

    execute(file: AttachedFileInput): FutureData<AttachedFile> {
        return this.repository.create(file);
    }
}
