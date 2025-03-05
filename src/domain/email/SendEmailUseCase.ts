import { Either } from "../common/entities/Either";
import { Email } from "./Email";
import { EmailRepository } from "./EmailRepository";
import { SendEmailError } from "./SendEmailError";

export class SendEmailUseCase {
    constructor(private emailRepository: EmailRepository) {}

    execute(email: Email): Promise<Either<SendEmailError, void>> {
        return this.emailRepository.send(email);
    }
}
