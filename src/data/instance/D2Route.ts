import _ from "lodash";
import { Id } from "../../domain/common/entities/Schemas";
import { SharingSetting } from "../../domain/common/entities/SharingSetting";
import { Instance } from "../../domain/instance/entities/Instance";
import { D2User } from "../../types/d2-api";
import { removeTrailingSlash } from "../../utils/d2-utils";

export type D2Route = {
    auth?: RouteAuth;
    authorities?: string[];
    code: Id;
    created?: string;
    createdBy?: D2User;
    description: string;
    disabled: boolean;
    displayName: string;
    favorite?: boolean;
    headers: Record<string, string>;
    href?: string;
    id: Id;
    lastUpdated?: string;
    lastUpdatedBy?: D2User;
    name: string;
    responseTimeoutSeconds?: number;
    sharing: D2ObjectSharing;
    url: string;
    user?: D2User;
};

export interface D2ObjectSharing {
    owner: string;
    external: boolean;
    users: Record<string, SharingSetting>;
    userGroups: Record<string, SharingSetting>;
    public: string;
}

type RouteAuth = {
    type: "http-basic" | "api-token";
    username?: string;
    password?: string;
    token?: string;
};

// DHIS2 defaults to 5 seconds, which is too short for large metadata searches.
export const ROUTE_RESPONSE_TIMEOUT_SECONDS = 60;

export function buildRoute(instance: Instance): D2Route {
    const url = removeTrailingSlash(instance.url);

    return {
        auth:
            instance.authType === "api-token"
                ? { type: "api-token", token: instance.token }
                : { type: "http-basic", username: instance.username, password: instance.password },
        code: slugify(instance.name),
        description: instance.description,
        disabled: false,
        displayName: instance.name,
        headers: {},
        id: instance.id,
        name: instance.name,
        responseTimeoutSeconds: ROUTE_RESPONSE_TIMEOUT_SECONDS,
        sharing: {
            external: false,
            owner: instance.user.id,
            public: instance.publicAccess,
            users: mapArrayToRecord(instance.userAccesses),
            userGroups: mapArrayToRecord(instance.userGroupAccesses),
        },
        url: `${url}/**`,
    };
}

function slugify(text: string): string {
    return text
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

function mapArrayToRecord(array: SharingSetting[]): Record<string, SharingSetting> {
    return _.keyBy(array, "id");
}
