import { FutureData } from "../../common/entities/Future";
import { Message } from "../entities/Message";
import { MessageRecipient } from "../entities/MessageRecipient";

export interface MessageRepository {
    searchRecipients(text: string): FutureData<MessageRecipient[]>;
    send(message: Message): FutureData<void>;
}
