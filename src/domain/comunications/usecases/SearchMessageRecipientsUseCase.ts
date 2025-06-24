import { FutureData } from "../../common/entities/Future";
import { MessageRecipient } from "../entities/MessageRecipient";
import { MessageRepository } from "../repositories/MessageRepository";

export class SearchMessageRecipientsUseCase {
    constructor(private messageRepository: MessageRepository) {}

    execute(text: string): FutureData<MessageRecipient[]> {
        return this.messageRepository.searchRecipients(text);
    }
}
