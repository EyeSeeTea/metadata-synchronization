import { FutureData } from "../../../common/entities/Future";
import { WmrSyncAccessInfo } from "../entities/WmrSyncAccess";

export interface WmrSyncAccessRepository {
    get(): FutureData<WmrSyncAccessInfo>;
}
