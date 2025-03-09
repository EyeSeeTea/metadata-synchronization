import { Email } from "../../domain/comunications/entities/Email";
import { EmailRepository } from "../../domain/comunications/repositories/EmailRepository";
import { D2Api } from "../../types/d2-api";
import { apiToFuture } from "../common/utils/futures";
import { FutureData } from "../../domain/common/entities/Future";

export class EmailD2ApiRepository implements EmailRepository {
    constructor(private readonly d2Api: D2Api) {}

    send(message: Email): FutureData<void> {
        return apiToFuture(this.d2Api.email.sendMessage(message));
    }
}
