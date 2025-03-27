import _ from "lodash";
import { Either } from "../../common/entities/Either";
import { ValidationError } from "../../common/entities/Validations";
import { ValueObject } from "../../common/entities/ValueObject";
import { EmailAddress } from "./EmailAddress";

export type EmailData = {
    recipients: string[];
    subject: string;
    text: string;
};

export type EmailProps = Pick<EmailData, "subject" | "text"> & {
    recipients: EmailAddress[];
};

export class Email extends ValueObject<EmailProps> {
    public readonly recipients: EmailAddress[];
    public readonly subject: string;
    public readonly text: string;

    private constructor(props: EmailProps) {
        super(props);

        this.recipients = props.recipients;
        this.subject = props.subject;
        this.text = props.text;
    }

    public static create(data: EmailData): Either<ValidationError[], Email> {
        const recipientsError = data.recipients.length === 0;

        if (recipientsError)
            return Either.error([
                {
                    property: "recipients",
                    error: "invalid_recipients",
                    description: "Email must have at least one recipient",
                },
            ]);

        const emailResponses = data.recipients.map(email => EmailAddress.create(email));

        const emailErrors = _.compact(
            emailResponses.filter(response => response.isError).map(response => response.value.error)
        );

        if (emailErrors.length > 0) {
            return Either.error(emailErrors);
        } else {
            const emails = _.compact(emailResponses.map(response => response.value.data));

            return Either.success(new Email({ ...data, recipients: emails }));
        }
    }
}
