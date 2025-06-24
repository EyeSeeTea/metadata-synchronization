import { FutureData } from "../../common/entities/Future";
import { AttachedFile, AttachedFileInput } from "../entities/AttachedFile";

export interface AttachedFileRepository {
    create(file: AttachedFileInput): FutureData<AttachedFile>;
    updateSharing(file: AttachedFile): FutureData<void>;
}
