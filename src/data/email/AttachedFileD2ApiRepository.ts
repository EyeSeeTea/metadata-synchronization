import { Future, FutureData } from "../../domain/common/entities/Future";
import { AttachedFile, AttachedFileInput } from "../../domain/email/entities/AttachedFile";
import { AttachedFileRepository } from "../../domain/email/repositories/AttachedFileRepository";
import { D2Api } from "../../types/d2-api";
import { apiToFuture } from "../common/utils/futures";

export class AttachedFileD2ApiRepository implements AttachedFileRepository {
    constructor(private api: D2Api) {}

    save(file: AttachedFileInput): FutureData<AttachedFile> {
        return apiToFuture(this.api.files.upload(file))
            .flatMap(({ id }) => {
                return Future.joinObj({
                    id: Future.success(id),
                    sharing: apiToFuture(
                        this.api.sharing.post(
                            { id, type: "document" },
                            { publicAccess: "rw------", externalAccess: true }
                        )
                    ),
                });
            })
            .map(({ id }) => {
                const isDev = process.env.NODE_ENV === "development";
                const baseUrl = isDev ? process.env.REACT_APP_DHIS2_BASE_URL : this.api.baseUrl;
                return { id, name: file.name, url: `${baseUrl}/api/documents/${id}/data` };
            });
    }
}
