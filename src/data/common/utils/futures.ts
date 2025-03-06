import { CancelableResponse } from "@eyeseetea/d2-api/repositories/CancelableResponse";
import { Future, FutureData } from "../../../domain/common/entities/Future";
import i18n from "../../../locales";

export function apiToFuture<Data>(res: CancelableResponse<Data>): FutureData<Data> {
    return Future.fromComputation((resolve, reject) => {
        res.getData()
            .then(resolve)
            .catch(err => {
                reject(err.response?.data?.message || err.message || i18n.t("Unknown error to send email"));
            });

        return res.cancel;
    });
}
