import { FutureData } from "../common/entities/Future";
import { Email } from "./Email";

export interface EmailRepository {
    send(message: Email): FutureData<void>;
}
