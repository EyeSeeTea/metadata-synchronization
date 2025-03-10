import { FutureData } from "../../common/entities/Future";
import { Message, MessageRecipient } from "../entities/Message";

export interface MessageRepository {
    searchRecipients(text: string): FutureData<MessageRecipient[]>;
    send(message: Message): FutureData<void>;
}
