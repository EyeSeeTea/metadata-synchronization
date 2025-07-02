import { FutureData } from "../../common/entities/Future";
import { Instance } from "../entities/Instance";

export interface InstanceValidator {
    ping(instance: Instance): FutureData<void>;
}
