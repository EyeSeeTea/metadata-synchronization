import { Instance } from "../../../../domain/instance/entities/Instance";
import { ObjectSharing } from "../../../../domain/storage/repositories/StorageClient";
import { encrypt } from "../../../../utils/crypto";
import { Namespace } from "../../../storage/Namespaces";
import { AppStorage } from "../../client/types";
import { migrate, missingEncryptionKeyError } from "../16.instances-as-routes";

const postRoute = vi.fn((_url: string, _params: object, _route: object) => ({ getData: () => Promise.resolve({}) }));

vi.mock("../../../../utils/d2-utils", async importOriginal => ({
    ...(await importOriginal<typeof import("../../../../utils/d2-utils")>()),
    getD2APiFromInstance: () => ({ post: postRoute }),
}));

const fakeEncryptionKey = "fake-test-encryption-key";
const fakeToken = "fake-token";
const fakeUsername = "fake-user";
const remoteInstanceId = "remote-instance-id";
const remoteInstanceKey = `${Namespace.INSTANCES}-${remoteInstanceId}`;
const localInstanceKey = `${Namespace.INSTANCES}-LOCAL`;

const localInstance = Instance.build({ type: "local", name: "This instance", url: "http://localhost:8080" });

const remoteInstanceData = {
    id: remoteInstanceId,
    type: "dhis",
    name: "Remote instance",
    url: "https://remote.example.org",
};

class InMemoryAppStorage implements AppStorage {
    private values: Readonly<Record<string, object>>;

    constructor(values: Readonly<Record<string, object>>) {
        this.values = values;
    }

    get keys(): ReadonlyArray<string> {
        return Object.keys(this.values);
    }

    async get<T extends object>(key: string): Promise<T | undefined> {
        // Test double: values are seeded by each test with the shape the migration reads.
        return this.values[key] as T | undefined;
    }

    async getOrCreate<T extends object>(key: string, defaultValue: T): Promise<T> {
        return (await this.get<T>(key)) ?? defaultValue;
    }

    async save<T extends object>(key: string, value: T): Promise<void> {
        this.values = { ...this.values, [key]: value };
    }

    async remove(key: string): Promise<void> {
        this.values = Object.fromEntries(Object.entries(this.values).filter(([existingKey]) => existingKey !== key));
    }

    async listKeys(): Promise<string[]> {
        return Object.keys(this.values);
    }

    async getObjectSharing(_key: string): Promise<ObjectSharing | undefined> {
        return undefined;
    }
}

function buildStorage(remoteInstance: object, advancedProps: object): InMemoryAppStorage {
    return new InMemoryAppStorage({
        [Namespace.INSTANCES]: [{ id: "LOCAL", type: "local", name: "This instance", url: "" }, remoteInstance],
        [localInstanceKey]: {},
        [remoteInstanceKey]: advancedProps,
    });
}

function stubAppConfigResponse(response: Response): ReturnType<typeof vi.fn> {
    const fetchAppConfig = vi.fn(() => Promise.resolve(response));
    vi.stubGlobal("fetch", fetchAppConfig);
    return fetchAppConfig;
}

function postedAuths(): ReadonlyArray<unknown> {
    return postRoute.mock.calls.map(([, , route]) => ("auth" in route ? route.auth : {}));
}

function runMigration(storage: AppStorage): Promise<void> {
    return migrate(storage, () => {}, { localInstance });
}

describe("migration 16: instances as routes", () => {
    beforeEach(() => {
        postRoute.mockClear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe("when no stored instance has a password", () => {
        it("migrates without reading app-config.json", async () => {
            const fetchAppConfig = stubAppConfigResponse(new Response("", { status: 404 }));
            const storage = buildStorage({ ...remoteInstanceData, authType: "api-token", token: fakeToken }, {});

            await runMigration(storage);

            expect(fetchAppConfig).not.toHaveBeenCalled();
            expect(postedAuths()).toEqual([{ type: "api-token", token: fakeToken }]);
            expect(await storage.get(Namespace.INSTANCES)).toEqual([{ id: remoteInstanceId }]);
            expect(storage.keys).toEqual([Namespace.INSTANCES]);
        });
    });

    describe("when a stored instance has an encrypted password", () => {
        const plainPassword = "fake-test-password";

        async function buildStorageWithPassword(): Promise<InMemoryAppStorage> {
            const encryptedPassword = await encrypt(plainPassword, fakeEncryptionKey);
            return buildStorage(remoteInstanceData, { username: fakeUsername, password: encryptedPassword });
        }

        it("decrypts it with the key from app-config.json", async () => {
            stubAppConfigResponse(new Response(JSON.stringify({ encryptionKey: fakeEncryptionKey })));
            const storage = await buildStorageWithPassword();

            await runMigration(storage);

            expect(postedAuths()).toEqual([{ type: "http-basic", username: fakeUsername, password: plainPassword }]);
        });

        it("fails with the key error when app-config.json has an empty key", async () => {
            stubAppConfigResponse(new Response(JSON.stringify({ encryptionKey: "" })));
            const storage = await buildStorageWithPassword();

            await expect(runMigration(storage)).rejects.toThrow(missingEncryptionKeyError);
            expect(postRoute).not.toHaveBeenCalled();
        });

        it("fails with the key error when app-config.json has no encryptionKey field", async () => {
            stubAppConfigResponse(new Response(JSON.stringify({ appKey: "metadata-synchronization" })));
            const storage = await buildStorageWithPassword();

            await expect(runMigration(storage)).rejects.toThrow(missingEncryptionKeyError);
            expect(postRoute).not.toHaveBeenCalled();
        });

        it("fails with the key error when app-config.json is missing", async () => {
            stubAppConfigResponse(new Response("", { status: 404 }));
            const storage = await buildStorageWithPassword();

            await expect(runMigration(storage)).rejects.toThrow(missingEncryptionKeyError);
            expect(postRoute).not.toHaveBeenCalled();
        });
    });
});
