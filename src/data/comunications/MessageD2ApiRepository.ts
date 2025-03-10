import { D2Api, MetadataPick } from "../../types/d2-api";
import { apiToFuture } from "../common/utils/futures";
import { Future, FutureData } from "../../domain/common/entities/Future";
import { MessageRepository } from "../../domain/comunications/repositories/MessageRepository";
import { Message, MessageRecipient } from "../../domain/comunications/entities/Message";
import { PostMessage } from "@eyeseetea/d2-api/api/messageConversations";

export class MessageD2ApiRepository implements MessageRepository {
    constructor(private readonly d2Api: D2Api) {}

    searchRecipients(text: string): FutureData<MessageRecipient[]> {
        return Future.joinObj({
            users: apiToFuture(
                this.d2Api.models.users.get({
                    fields: fields,
                    paging: false,
                    filter: { displayName: { like: text } },
                })
            ).map(response => response.objects.map(this.buildUserRecipient)),
            userGroups: apiToFuture(
                this.d2Api.models.userGroups.get({
                    fields: fields,
                    paging: false,
                    filter: { displayName: { like: text } },
                })
            ).map(response => response.objects.map(this.buildUserGroupRecipient)),
        }).flatMap(responses => Future.success([...responses.users, ...responses.userGroups]));
    }

    send(message: Message): FutureData<void> {
        return apiToFuture(this.d2Api.messageConversations.post(this.buildPostMessage(message)));
    }

    buildPostMessage(message: Message): PostMessage {
        return {
            subject: message.subject,
            text: message.text,
            users: message.recipients
                .filter(recipient => recipient.type === "User")
                .map(recipient => ({ id: recipient.id })),
            userGroups: message.recipients
                .filter(recipient => recipient.type === "UserGroup")
                .map(recipient => ({ id: recipient.id })),
            organisationUnits: [],
        };
    }

    buildUserRecipient(user: D2User): MessageRecipient {
        return {
            type: "User",
            id: user.id,
            name: user.displayName,
        };
    }

    buildUserGroupRecipient(userGroup: D2UserGroup): MessageRecipient {
        return {
            type: "UserGroup",
            id: userGroup.id,
            name: userGroup.displayName,
        };
    }
}

const fields = { id: true, displayName: true } as const;

type D2UserGroup = MetadataPick<{
    userGroups: { fields: typeof fields };
}>["userGroups"][number];

type D2User = MetadataPick<{
    userGroups: { fields: typeof fields };
}>["userGroups"][number];
