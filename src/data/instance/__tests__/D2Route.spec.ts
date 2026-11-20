import { describe, expect, it } from "vitest";
import { Instance } from "../../../domain/instance/entities/Instance";
import { buildRoute } from "../D2Route";

const userAccess = { id: "user01", access: "rw------", displayName: "User 01" };
const userGroupAccess = { id: "group01", access: "r-------", displayName: "Group 01" };

const buildInstance = (data: Partial<Parameters<typeof Instance.build>[0]> = {}): Instance =>
    Instance.build({
        id: "instance01",
        type: "dhis",
        name: "Ságo Remote Instance",
        url: "https://remote.example.org/",
        description: "Remote server",
        username: "admin",
        password: "secret",
        ...data,
    });

describe("buildRoute", () => {
    it("builds an http-basic route with a slug code and a wildcard url", () => {
        const route = buildRoute(buildInstance());

        expect(route).toMatchObject({
            id: "instance01",
            name: "Ságo Remote Instance",
            displayName: "Ságo Remote Instance",
            code: "sago-remote-instance",
            description: "Remote server",
            disabled: false,
            url: "https://remote.example.org/**",
            auth: { type: "http-basic", username: "admin", password: "secret" },
        });
    });

    it("does not set any header", () => {
        expect(buildRoute(buildInstance()).headers).toEqual({});
    });

    it("uses the token for api-token instances", () => {
        const route = buildRoute(buildInstance({ authType: "api-token", token: "d2p_token" }));

        expect(route.auth).toEqual({ type: "api-token", token: "d2p_token" });
    });

    it("maps sharing settings to records keyed by id", () => {
        const route = buildRoute(
            buildInstance({
                publicAccess: "r-------",
                user: { id: "owner01", name: "Owner" },
                userAccesses: [userAccess],
                userGroupAccesses: [userGroupAccess],
            })
        );

        expect(route.sharing).toEqual({
            external: false,
            owner: "owner01",
            public: "r-------",
            users: { user01: userAccess },
            userGroups: { group01: userGroupAccess },
        });
    });
});
