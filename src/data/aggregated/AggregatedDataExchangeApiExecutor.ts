import { b } from "vitest/dist/chunks/suite.d.FvehnV49";
import { AggregatedDataExchangeExecutor } from "../../domain/aggregated/repositories/AggregatedDataExchangeExecutor";
import { Instance } from "../../domain/instance/entities/Instance";
import { SynchronizationResult } from "../../domain/reports/entities/SynchronizationResult";
import { D2Api } from "../../types/d2-api";
import { getD2APiFromInstance } from "../../utils/d2-utils";

export class AggregatedDataExchangeApiExecutor implements AggregatedDataExchangeExecutor {
    private api: D2Api;

    constructor(localInstance: Instance) {
        this.api = getD2APiFromInstance(localInstance);
    }

    async execute(aggregatedDataExchangeId: string, targetInstance: Instance): Promise<SynchronizationResult> {
        const result = await this.api
            .post<AdexExecutioonResponse>(`aggregateDataExchanges/${aggregatedDataExchangeId}/exchange`)
            .getData();

        return this.buildSynchronizationResult(result, targetInstance);
    }

    private buildSynchronizationResult(
        importResult: AdexExecutioonResponse,
        targetInstance: Instance
    ): SynchronizationResult {
        const { status, imported, updated, ignored, deleted } = importResult;

        // const errors =
        // conflicts?.map(({ object, value }) => ({
        //     id: object,
        //     message: value,
        // })) ?? [];

        return {
            status,
            message: "",
            stats: {
                imported,
                updated,
                ignored,
                deleted,
            },
            instance: targetInstance.toPublicObject(),
            errors: [],
            date: new Date(),
            type: "aggregated",
            response: importResult,
        };
    }
}

type AdexExecutioonResponse = {
    responseType: "ImportSummaries";
    status: "SUCCESS" | "ERROR" | "WARNING";
    imported: number;
    updated: number;
    ignored: number;
    deleted: number;
};
