import { Instance } from "../../instance/entities/Instance";
import { SynchronizationResult } from "../../reports/entities/SynchronizationResult";
import { AggregatedPackage } from "../entities/AggregatedPackage";

export interface AggregatedDataExchangeExecutor {
    execute(aggregatedDataExchangeId: string, targetInstance: Instance): Promise<SynchronizationResult>;
    getSourceData(aggregatedDataExchangeId: string[]): Promise<AggregatedPackage>;
}
