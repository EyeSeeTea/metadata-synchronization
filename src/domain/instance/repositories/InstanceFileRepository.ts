import { Instance } from "../entities/Instance";

export interface InstanceFileRepositoryConstructor {
    new (instance: Instance): InstanceFileRepository;
}

export type FileId = string;

export interface InstanceFileRepository {
    getById(fileId: FileId): Promise<File>;
    save(id: string, file: File): Promise<FileId>;
}
