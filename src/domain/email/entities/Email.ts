import { Struct } from "../../common/entities/Struct";

export type EmailProps = {
    recipients: string[];
    subject: string;
    text: string;
};

export class Email extends Struct<EmailProps>() {}
