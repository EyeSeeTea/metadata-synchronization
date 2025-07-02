import { Future, FutureData } from "../../domain/common/entities/Future";
import { Instance } from "../../domain/instance/entities/Instance";
import { InstanceValidator } from "../../domain/instance/repositories/InstanceValidator";
import { getD2APiFromInstance } from "../../utils/d2-utils";

export class InstanceD2Validator implements InstanceValidator {
    constructor(private localIntance: Instance) {}

    ping(instance: Instance): FutureData<void> {
        const d2Api = getD2APiFromInstance(this.localIntance, instance);

        return Future.success(undefined);
    }
}
