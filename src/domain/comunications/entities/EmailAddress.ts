import { Either } from "../../common/entities/Either";
import { ValidationError } from "../../common/entities/Validations";
import { ValueObject } from "../../common/entities/ValueObject";

export interface EmailAddressProps {
    value: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailAddress extends ValueObject<EmailAddressProps> {
    public readonly value: string;

    private constructor(props: EmailAddressProps) {
        super(props);

        this.value = props.value;
    }

    public static create(email: string): Either<ValidationError, EmailAddress> {
        const error = this.validate(email);

        if (error) {
            return Either.error(error);
        } else {
            return Either.success(new EmailAddress({ value: this.format(email) }));
        }
    }

    private static validate(email: string): ValidationError | undefined {
        const isValid = EMAIL_PATTERN.test(email);

        return isValid
            ? undefined
            : { property: "value", error: "invalid_email", description: "Email must be a valid email address" };
    }

    private static format(email: string): string {
        return email.trim().toLowerCase();
    }
}
