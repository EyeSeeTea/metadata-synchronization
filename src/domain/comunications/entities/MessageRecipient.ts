import _ from "lodash";
import { Either } from "../../common/entities/Either";
import { isBlank, ValidationError } from "../../common/entities/Validations";
import { ValueObject } from "../../common/entities/ValueObject";

export interface MessageRecipientProps {
    id: string;
    name: string;
    type: "User" | "UserGroup";
}

export class MessageRecipient extends ValueObject<MessageRecipientProps> {
    public readonly id: string;
    public readonly name: string;
    public readonly type: "User" | "UserGroup";

    private constructor(props: MessageRecipientProps) {
        super(props);

        this.id = props.id;
        this.name = props.name;
        this.type = props.type;
    }

    public static create(data: MessageRecipientProps): Either<ValidationError[], MessageRecipient> {
        const error = this.validate(data);

        if (error) {
            return Either.error(error);
        } else {
            return Either.success(new MessageRecipient(data));
        }
    }

    private static validate(data: MessageRecipientProps): ValidationError[] | undefined {
        const isMissingId = isBlank(data.id);
        const isMissingName = isBlank(data.name);
        const isMissingType = isBlank(data.type);

        const errors = _.compact([
            isMissingId ? { property: "id", error: "missing_id", description: "Id is required" } : undefined,
            isMissingName ? { property: "name", error: "missing_name", description: "Name is required" } : undefined,
            isMissingType ? { property: "type", error: "missing_type", description: "Type is required" } : undefined,
        ]);

        return errors.length > 0 ? errors : undefined;
    }
}
