import { FutureData } from "../../common/entities/Future";
import { Email } from "../entities/Email";
import { EmailRepository } from "../repositories/EmailRepository";

export class SendEmailUseCase {
    constructor(private emailRepository: EmailRepository) {}

    execute(email: Email): FutureData<void> {
        return this.emailRepository.send(email);
    }
}
