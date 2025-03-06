import { FutureData } from "../common/entities/Future";
import { Email } from "./Email";
import { EmailRepository } from "./EmailRepository";

export class SendEmailUseCase {
    constructor(private emailRepository: EmailRepository) {}

    execute(email: Email): FutureData<void> {
        return this.emailRepository.send(email);
    }
}
