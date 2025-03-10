import { Struct } from "../../common/entities/Struct";

export type MessageRecipient = {
    id: string;
    name: string;
    type: "User" | "UserGroup";
};

export type MessageProps = {
    subject: string;
    text: string;
    recipients: MessageRecipient[];
};

export class Message extends Struct<MessageProps>() {}
