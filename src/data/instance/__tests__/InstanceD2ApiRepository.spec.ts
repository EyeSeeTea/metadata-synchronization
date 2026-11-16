import { Server } from "miragejs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Instance } from "../../../domain/instance/entities/Instance";
import { StorageClientFactory } from "../../config/StorageClientFactory";
import { startDhis } from "../../../utils/dhisServer";
import { InstanceD2ApiRepository } from "../InstanceD2ApiRepository";

const baseUrl = "http://origin.test";
const targetUrl = "https://target.test/dhis2";

const localInstance = Instance.build({ url: baseUrl, name: "Local", version: "2.43", type: "local" });

const storageClientFactory = {
    getStorageClientPromise: async () => ({
        saveObjectInCollection: async () => undefined,
        listObjectsInCollection: async () => [],
    }),
} as unknown as StorageClientFactory;

describe("InstanceD2ApiRepository", () => {
    let server: Server;
    let postedRoutes: unknown[];

    beforeEach(() => {
        postedRoutes = [];
        server = startDhis({ urlPrefix: baseUrl });
        server.get("/routes", async () => ({ routes: [] }));
        server.post("/routes", async (_schema, request) => {
            postedRoutes.push(JSON.parse(request.requestBody));
            return { status: "OK" };
        });
    });

    afterEach(() => {
        server.shutdown();
    });

    describe("save", () => {
        it("creates the route without fixed headers, so the client's Content-Type is sent only once", async () => {
            const target = Instance.build({
                id: "targetRoute",
                name: "Target",
                url: targetUrl,
                username: "user",
                password: "secret",
                type: "dhis",
            });

            await new InstanceD2ApiRepository(localInstance, storageClientFactory).save(target);

            expect(postedRoutes).toEqual([
                {
                    auth: { type: "http-basic", username: "user", password: "secret" },
                    code: "target",
                    description: "",
                    disabled: false,
                    displayName: "Target",
                    id: "targetRoute",
                    name: "Target",
                    sharing: { external: false, owner: "", public: "--------", users: {}, userGroups: {} },
                    url: `${targetUrl}/**`,
                },
            ]);
        });
    });
});
