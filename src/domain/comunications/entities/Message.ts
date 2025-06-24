import _ from "lodash";
import { Either } from "../../common/entities/Either";
import { ValidationError } from "../../common/entities/Validations";
import { ValueObject } from "../../common/entities/ValueObject";
import { MessageRecipient, MessageRecipientProps } from "./MessageRecipient";

export type MessageData = {
    recipients: MessageRecipientProps[];
    subject: string;
    text: string;
};

export type MessageProps = Pick<MessageData, "subject" | "text"> & {
    recipients: MessageRecipient[];
};

export class Message extends ValueObject<MessageProps> {
    public readonly recipients: MessageRecipient[];
    public readonly subject: string;
    public readonly text: string;

    private constructor(props: MessageProps) {
        super(props);

        this.recipients = props.recipients;
        this.subject = props.subject;
        this.text = props.text;
    }

    public static create(data: MessageData): Either<ValidationError[], Message> {
        const recipientsError = data.recipients.length === 0;

        if (recipientsError)
            return Either.error([
                {
                    property: "recipients",
                    error: "invalid_recipients",
                    description: "Message must have at least one recipient",
                },
            ]);

        const recipientResponses = data.recipients.map(recipient => MessageRecipient.create(recipient));

        const recipientErrors = _.compact(
            recipientResponses.filter(response => response.isError).map(response => response.value.error)
        ).flat();

        if (recipientErrors.length > 0) {
            return Either.error(recipientErrors);
        } else {
            const recipients = _.compact(recipientResponses.map(response => response.value.data));

            return Either.success(new Message({ ...data, recipients: recipients }));
        }
    }
}
