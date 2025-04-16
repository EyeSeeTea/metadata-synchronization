import { AxiosError } from "axios";
import { Future, FutureData } from "../../../domain/common/entities/Future";
import { CancelableResponse } from "../../../types/d2-api";

type SpecificError = {
    response: {
        data: {
            message: string;
        };
    };
};

/**
 * @description This file is refactored
 */
export function apiToFuture<Data>(res: CancelableResponse<Data>): FutureData<Data> {
    return Future.fromComputation((resolve, reject) => {
        res.getData()
            .then(resolve)
            .catch((err: unknown) => {
                if (isSpecificError(err)) {
                    reject(new Error(err.response.data.message));
                } else if (err instanceof Error) {
                    reject(err);
                } else {
                    console.error("apiToFuture:uncatched", err);

                    reject(new Error("Unknown error"));
                }
            });
        return res.cancel;
    });
}

const isSpecificError = (err: unknown): err is SpecificError => {
    if (!err || typeof err !== "object") return false;

    const specificError = err as { response?: { data?: { message?: unknown } } };

    return (
        typeof specificError.response === "object" &&
        specificError.response !== null &&
        typeof specificError.response.data === "object" &&
        specificError.response.data !== null &&
        typeof specificError.response.data.message === "string"
    );
};
