import { FutureData } from "../../common/entities/Future";
import { AttachedFile, AttachedFileInput } from "../entities/AttachedFile";

export interface AttachedFileRepository {
    save(file: AttachedFileInput): FutureData<AttachedFile>;
}
