import { CancelableResponse } from "@eyeseetea/d2-api";
import { Future } from "../domain/common/entities/Future";

export type FutureData<D> = Future<Error, D>;

export function apiToFuture<Data>(res: CancelableResponse<Data>): FutureData<Data> {
    return Future.fromComputation((resolve, reject) => {
        res.getData()
            .then(resolve)
            .catch((err: unknown) => {
                if (err instanceof Error) {
                    reject(err);
                } else {
                    console.error("apiToFuture:uncatched", err);
                    reject(new Error("Unknown error"));
                }
            });
        return res.cancel;
    });
}
