import { FutureData } from "../../../common/entities/Future";
import { WmrUserSettings } from "../entities/WmrUserSettings";

export interface WmrUserSettingsRepository {
    get(): FutureData<WmrUserSettings>;
    save(settings: WmrUserSettings): FutureData<void>;
}
