import { FutureData } from "../../common/entities/Future";
import { Message } from "../entities/Message";
import { MessageRepository } from "../repositories/MessageRepository";

export class SendMessageUseCase {
    constructor(private messageRepository: MessageRepository) {}

    execute(message: Message): FutureData<void> {
        return this.messageRepository.send(message);
    }
}
