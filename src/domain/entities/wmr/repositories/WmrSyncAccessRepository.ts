import { FutureData } from "../../../common/entities/Future";
import { WmrFlowKind } from "../entities/WmrFlowKind";
import { WmrSyncAccessInfo } from "../entities/WmrSyncAccess";

export interface WmrSyncAccessRepository {
    get(flowKind: WmrFlowKind): FutureData<WmrSyncAccessInfo>;
}
