import { Either } from "../common/entities/Either";
import { Email } from "./Email";
import { SendEmailError } from "./SendEmailError";

export interface EmailRepository {
    send(message: Email): Promise<Either<SendEmailError, void>>;
}
