import { MigrationParams } from ".";
import { Instance, InstanceData } from "../../../domain/instance/entities/Instance";
import { Debug } from "../../../domain/migrations/entities/Debug";
import { ObjectSharing } from "../../../domain/storage/repositories/StorageClient";
import { promiseMap } from "../../../utils/common";
import { AppStorage, Migration } from "../client/types";
import { D2Route, mapArrayToRecord, slugify } from "../../instance/InstanceD2ApiRepository";
import { decrypt } from "../../../utils/crypto";
import { Namespace } from "../../storage/Namespaces";
import { getD2APiFromInstance, removeTrailingSlash } from "../../../utils/d2-utils";

type DataStoreInstance = { id: string };

type StoredInstance = Readonly<{
    instanceData: InstanceData;
    sharing: ObjectSharing | undefined;
    username: string | undefined;
    encryptedPassword: string | undefined;
}>;

export const missingEncryptionKeyError =
    "app-config.json has no encryptionKey. It is needed to decrypt the passwords of remote instances " +
    "saved before version 2.25.0. Add the encryption key of the previous installation as encryptionKey in " +
    "app-config.json inside the release ZIP and install it again. See README, section Upgrading from versions " +
    "before 2.25.0.";

export async function migrate(storage: AppStorage, _debug: Debug, { localInstance }: MigrationParams): Promise<void> {
    if (!localInstance) {
        throw new Error("localInstance is required");
    }

    const storedInstances = await getStoredInstances(storage);
    const hasEncryptedPasswords = storedInstances.some(({ encryptedPassword }) => Boolean(encryptedPassword));
    const encryptionKey = hasEncryptedPasswords ? await getEncryptionKey() : undefined;

    const instances = await promiseMap(storedInstances, storedInstance => buildInstance(storedInstance, encryptionKey));

    const d2api = getD2APiFromInstance(localInstance);

    await promiseMap(instances, async instance => {
        const route = buildRoute(instance);

        await d2api.post("/routes", {}, route).getData();

        const key = `${Namespace.INSTANCES}-${instance.id}`;

        await storage.remove(key);
    });

    await storage.remove(`${Namespace.INSTANCES}-LOCAL`);

    const dataStoreInstances = instances.map(instance => ({ id: instance.id }));

    await storage.save<DataStoreInstance[]>(Namespace.INSTANCES, dataStoreInstances);
}

const migration: Migration<MigrationParams> = {
    name: "Migrate instances from data store to routes",
    migrate,
};

export default migration;

async function getEncryptionKey(): Promise<string> {
    const response = await fetch("app-config.json", { credentials: "same-origin" });
    const appConfig: unknown = response.ok ? await response.json() : undefined;
    const encryptionKey =
        typeof appConfig === "object" && appConfig !== null && "encryptionKey" in appConfig
            ? appConfig.encryptionKey
            : undefined;

    if (typeof encryptionKey !== "string" || encryptionKey === "") throw new Error(missingEncryptionKeyError);

    return encryptionKey;
}

async function getStoredInstances(storage: AppStorage): Promise<StoredInstance[]> {
    const dataStoreBaseInstances = await storage.get<InstanceData[]>(Namespace.INSTANCES);

    if (!dataStoreBaseInstances) {
        return [];
    }

    const dataStoreInstances = dataStoreBaseInstances.filter(instance => instance.id !== "LOCAL");

    return promiseMap(dataStoreInstances, async instanceData => {
        const sharing = await getObjectSharingOrError(storage, instanceData.id);
        const advancedProps = await storage.get<{ username?: string; password?: string }>(
            `${Namespace.INSTANCES}-${instanceData.id}`
        );

        return {
            instanceData,
            sharing,
            username: advancedProps?.username,
            encryptedPassword: advancedProps?.password,
        };
    });
}

async function buildInstance(storedInstance: StoredInstance, encryptionKey: string | undefined): Promise<Instance> {
    const { instanceData, sharing, username, encryptedPassword } = storedInstance;
    const password = encryptedPassword && encryptionKey ? await decrypt(encryptedPassword, encryptionKey) : "";

    return Instance.build({
        ...instanceData,
        url: instanceData.url,
        version: instanceData.version,
        username: username,
        password: password,
        ...(sharing ?? {
            publicAccess: "--------",
            userAccesses: [],
            userGroupAccesses: [],
            user: {
                id: "",
                name: "",
            },
            externalAccess: false,
        }),
    });
}

async function getObjectSharingOrError(storage: AppStorage, id: string): Promise<ObjectSharing | undefined> {
    try {
        const key = `${Namespace.INSTANCES}-${id}`;

        const sharing = await storage.getObjectSharing(key);

        return sharing;
    } catch {
        return undefined;
    }
}

function buildRoute(instance: Instance): D2Route {
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
        id: instance.id,
        name: instance.name,
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
