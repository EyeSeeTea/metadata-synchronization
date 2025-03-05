import i18n from "@eyeseetea/feedback-component/locales";

import { Email } from "../../domain/email/Email";
import { EmailRepository } from "../../domain/email/EmailRepository";
import { SendEmailError } from "../../domain/email/SendEmailError";
import { D2Api } from "../../types/d2-api";
import { Either } from "../../domain/common/entities/Either";
import { err } from "cmd-ts/dist/cjs/Result";

export class EmailD2ApiRepository implements EmailRepository {
    constructor(private readonly d2Api: D2Api) {}

    async send(message: Email): Promise<Either<SendEmailError, void>> {
        try {
            await this.d2Api.email.sendMessage(message).getData();

            return Either.success(undefined);
        } catch (error) {
            const err = error as any;

            if (err.response?.data) {
                const messageError = err.response.data.message;

                return Either.error(new SendEmailError(messageError));
            } else if (error instanceof Error) {
                const messageError = error.message ?? i18n.t("Unknown error to send email");

                return Either.error(new SendEmailError(messageError));
            } else {
                return Either.error(new SendEmailError(i18n.t("Unknown error to send email")));
            }
        }
    }
}
