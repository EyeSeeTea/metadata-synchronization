import { StorageClientRepository } from "../../storage-client-config/repositories/StorageClientRepository";
import { UserRepository } from "../../user/repositories/UserRepository";
import { SynchronizationRule } from "../entities/SynchronizationRule";

export interface RulesRepositoryConstructor {
    new (configRepository: StorageClientRepository, userRepository: UserRepository): RulesRepository;
}

export interface RulesRepository {
    getById(id: string): Promise<SynchronizationRule | undefined>;
    list(): Promise<SynchronizationRule[]>;
    save(rules: SynchronizationRule[]): Promise<void>;
    delete(id: string): Promise<void>;
}
