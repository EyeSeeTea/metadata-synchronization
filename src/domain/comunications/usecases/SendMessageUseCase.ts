import { Future, FutureData } from "../../common/entities/Future";
import { AttachedFile } from "../entities/AttachedFile";
import { Message } from "../entities/Message";
import { AttachedFileRepository } from "../repositories/AttachedFileRepository";
import { MessageRepository } from "../repositories/MessageRepository";

export class SendMessageUseCase {
    constructor(
        private messageRepository: MessageRepository,
        private attacchedFileRepository: AttachedFileRepository
    ) {}

    execute(message: Message, attachedFiles: AttachedFile[]): FutureData<void> {
        return this.updateSharingInFiles(message, attachedFiles).flatMap(() => {
            return this.messageRepository.send(message);
        });
    }

    private updateSharingInFiles(message: Message, attachedFiles: AttachedFile[]): FutureData<void> {
        const userAccesses = message.recipients
            .filter(recipient => recipient.type === "User")
            .map(recipient => {
                return { id: recipient.id, name: recipient.name, access: "rw------" };
            });

        const userGroupAccesses = message.recipients
            .filter(recipient => recipient.type === "UserGroup")
            .map(recipient => {
                return { id: recipient.id, name: recipient.name, access: "rw------" };
            });

        const files = attachedFiles.map(file => {
            return { ...file, sharing: { ...file.sharing, userAccesses, userGroupAccesses } };
        });

        const futures = files.map(file => {
            return this.attacchedFileRepository.updateSharing(file);
        });

        return Future.parallel(futures, { concurrency: 5 }).map(() => undefined);
    }
}
