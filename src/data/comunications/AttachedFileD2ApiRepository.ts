import { Future, FutureData } from "../../domain/common/entities/Future";
import { AttachedFile, AttachedFileInput, ObjectSharing } from "../../domain/comunications/entities/AttachedFile";
import { AttachedFileRepository } from "../../domain/comunications/repositories/AttachedFileRepository";

import { D2Api } from "../../types/d2-api";
import { apiToFuture } from "../common/utils/api-futures";

export class AttachedFileD2ApiRepository implements AttachedFileRepository {
    constructor(private api: D2Api) {}

    create(file: AttachedFileInput): FutureData<AttachedFile> {
        return apiToFuture(this.api.files.upload(file))
            .flatMap(({ id }) => {
                return Future.joinObj({
                    id: Future.success(id),
                    sharing: this.postSharing(id, file.sharing),
                });
            })
            .map(({ id }) => {
                const isDev = process.env.NODE_ENV === "development";
                const baseUrl = isDev ? process.env.REACT_APP_DHIS2_BASE_URL : this.api.baseUrl;
                return { id, name: file.name, url: `${baseUrl}/api/documents/${id}/data`, sharing: file.sharing };
            });
    }

    updateSharing(file: AttachedFile): FutureData<void> {
        return this.postSharing(file.id, file.sharing);
    }

    private postSharing(id: string, sharing: ObjectSharing) {
        return apiToFuture(this.api.sharing.post({ id, type: "document" }, sharing)).map(() => undefined);
    }
}
