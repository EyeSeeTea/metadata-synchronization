import { MigrationParams } from ".";
import { Instance, InstanceData } from "../../../domain/instance/entities/Instance";
import { Debug } from "../../../domain/migrations/entities/Debug";
import { ObjectSharing } from "../../../domain/storage/repositories/StorageClient";
import { promiseMap } from "../../../utils/common";
import { AppStorage, Migration } from "../client/types";
import Cryptr from "cryptr";
import { InstanceD2ApiRepository } from "../../instance/InstanceD2ApiRepository";

const instancesNamespace = "instances";

export async function migrate(storage: AppStorage, _debug: Debug, { localInstance }: MigrationParams): Promise<void> {
    if (!localInstance) {
        throw new Error("localInstance is required");
    }

    const encryptionKey = await getEncryptionKey();

    const instances = await getInstancesWithSharing(storage, encryptionKey);

    const instanceRepository = new InstanceD2ApiRepository(localInstance);

    await promiseMap(instances, async instance => {
        await instanceRepository.save(instance);

        const key = `${instancesNamespace}-${instance.id}`;
        await storage.remove(key);
    });

    await storage.remove(`${instancesNamespace}-LOCAL`);

    await storage.remove(instancesNamespace);
}

const migration: Migration<MigrationParams> = {
    name: "Migrate instances from data store to routes",
    migrate,
};

export default migration;

async function getEncryptionKey(): Promise<string> {
    const appConfig = await fetch("app-config.json", {
        credentials: "same-origin",
    }).then(res => res.json());

    const encryptionKey = appConfig?.encryptionKey;
    if (!encryptionKey) throw new Error("You need to provide a valid encryption key");

    return encryptionKey;
}

async function getInstancesWithSharing(storage: AppStorage, encryptionKey: string) {
    const dataStoreBaseInstances = await storage.get<InstanceData[]>(instancesNamespace);

    if (!dataStoreBaseInstances) {
        return [];
    }

    const dataStoreInstances = dataStoreBaseInstances.filter(instance => instance.id !== "LOCAL");

    const instances = await promiseMap(dataStoreInstances, async instance => {
        const sharing = await getObjectSharingOrError(storage, instance.id);
        const advancedProps = await storage.get<{ username?: string; password?: string }>(
            `${instancesNamespace}-${instance.id}`
        );

        const decryptPassword = (password?: string) => {
            return password ? new Cryptr(encryptionKey).decrypt(password) : "";
        };

        const mapToInstance = (instanceData: InstanceData, sharing: ObjectSharing | undefined) =>
            Instance.build({
                ...instanceData,
                url: instanceData.url,
                version: instanceData.version,
                username: advancedProps?.username,
                password: decryptPassword(advancedProps?.password),
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

        return mapToInstance(instance, sharing);
    });

    return instances;
}

async function getObjectSharingOrError(storage: AppStorage, id: string): Promise<ObjectSharing | undefined> {
    try {
        const key = `${instancesNamespace}-${id}`;

        const sharing = await storage.getObjectSharing(key);

        return sharing;
    } catch (error: any) {
        return undefined;
    }
}
