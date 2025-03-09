import { FutureData } from "../../common/entities/Future";
import { Email } from "../entities/Email";

export interface EmailRepository {
    send(message: Email): FutureData<void>;
}
