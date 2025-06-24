import { Future, FutureData } from "../../common/entities/Future";
import { AttachedFile } from "../entities/AttachedFile";
import { Email } from "../entities/Email";
import { AttachedFileRepository } from "../repositories/AttachedFileRepository";
import { EmailRepository } from "../repositories/EmailRepository";

export class SendEmailUseCase {
    constructor(private emailRepository: EmailRepository, private attacchedFileRepository: AttachedFileRepository) {}

    execute(email: Email, attachedFiles: AttachedFile[]): FutureData<void> {
        return this.updateSharingInFiles(attachedFiles).flatMap(() => {
            return this.emailRepository.send(email);
        });
    }
    private updateSharingInFiles(attachedFiles: AttachedFile[]): FutureData<void> {
        const files = attachedFiles.map(file => {
            return { ...file, sharing: { publicAccess: "rw------", externalAccess: true } };
        });

        const futures = files.map(file => {
            return this.attacchedFileRepository.updateSharing(file);
        });

        return Future.parallel(futures, { concurrency: 5 }).map(() => undefined);
    }
}
