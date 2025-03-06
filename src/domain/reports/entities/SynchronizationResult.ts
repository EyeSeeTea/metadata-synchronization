import { NamedRef } from "../../common/entities/Ref";
import { Store } from "../../stores/entities/Store";
import { SynchronizationPayload } from "../../synchronization/entities/SynchronizationPayload";
import { SynchronizationResultType } from "../../synchronization/entities/SynchronizationType";

export type SynchronizationStatus = "PENDING" | "SUCCESS" | "WARNING" | "ERROR" | "NETWORK ERROR";

export interface SynchronizationStats {
    type?: string;
    imported: number;
    updated: number;
    ignored: number;
    deleted: number;
    total?: number;
}

export interface ErrorMessage {
    id: string;
    message: string;
    type?: string;
    property?: string;
}

export type ResultInstance = {
    version?: string;
    url?: string;
} & NamedRef;

export interface SynchronizationResult {
    status: SynchronizationStatus;
    origin?: ResultInstance | Store; // TODO: Create union
    instance: ResultInstance;
    originPackage?: NamedRef;
    date: Date;
    type: SynchronizationResultType;
    message?: string;
    stats?: SynchronizationStats;
    typeStats?: SynchronizationStats[];
    errors?: ErrorMessage[];
    payload?: SynchronizationPayload;
    response?: object;
}
