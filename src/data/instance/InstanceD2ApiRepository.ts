//import Cryptr from "cryptr";
import _ from "lodash";
import { Instance } from "../../domain/instance/entities/Instance";
import { InstanceMessage } from "../../domain/instance/entities/Message";
import { InstanceRepository, InstancesFilter } from "../../domain/instance/repositories/InstanceRepository";
import { D2Api, D2User } from "../../types/d2-api";
import { cache } from "../../utils/cache";
import { promiseMap } from "../../utils/common";
import { getD2APiFromInstance } from "../../utils/d2-utils";
import { InmemoryCache } from "../common/InmemoryCache";
import { Id } from "../../domain/common/entities/Schemas";
import { SharingSetting } from "../../domain/common/entities/SharingSetting";
export class InstanceD2ApiRepository implements InstanceRepository {
    private api: D2Api;
    private cache = new InmemoryCache();

    constructor(private instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    async getAll({ search, ids }: InstancesFilter): Promise<Instance[]> {
        const objects = await this.getInstances();

        const filteredDataBySearch = search
            ? _.filter(objects, o =>
                  _(o)
                      .values()
                      .some(value =>
                          typeof value === "string" ? value.toLowerCase().includes(search.toLowerCase()) : false
                      )
              )
            : objects;

        const filteredDataByIds = filteredDataBySearch.filter(instanceData => !ids || ids.includes(instanceData.id));

        return filteredDataByIds;
    }

    async getById(id: string): Promise<Instance | undefined> {
        const existingInstances = await this.getInstances();

        const instance = existingInstances?.find(instance => instance.id === id);

        return instance;
    }

    async getByName(name: string): Promise<Instance | undefined> {
        const existingInstances = await this.getInstances();

        const instance = existingInstances?.find(instance => instance.name === name);

        return instance;
    }

    async save(instance: Instance): Promise<void> {
        this.cache.clear();

        const routeToUpload = this.buildRoute(instance);

        const existedRoute = await this.getById(instance.id);

        if (existedRoute) {
            await this.api.put(`/routes/${existedRoute.id}`, {}, routeToUpload).getData();
        } else {
            await this.api.post("/routes", {}, routeToUpload).getData();
        }
    }

    async delete(id: string): Promise<void> {
        await this.api.delete(`/routes/${id}`, {}).getData();
    }

    private buildRoute(instance: Instance): D2Route {
        return {
            auth:
                instance.username && instance.password
                    ? { type: "http-basic", username: instance.username, password: instance.password }
                    : undefined,
            code: slugify(instance.name),
            description: instance.description,
            disabled: false,
            displayName: instance.name,
            headers: { "Content-Type": "application/json" },
            id: instance.id,
            name: instance.name,
            sharing: {
                external: false,
                owner: instance.user.id,
                public: instance.publicAccess,
                users: mapArrayToRecord(instance.userAccesses),
                userGroups: mapArrayToRecord(instance.userGroupAccesses),
            },
            url: instance.url.endsWith("/") ? `${instance.url}**` : `${instance.url}/**`,
        };
    }

    private buildInstance(route: D2Route): Instance {
        return Instance.build({
            type: "dhis",
            id: route.id,
            name: route.name,
            url: route.url.replace("**", ""),
            username: route.auth?.username,
            password: route.auth?.password,
            description: route.description,
            publicAccess: route.sharing.public,
            userAccesses: Object.values(route.sharing.users),
            userGroupAccesses: Object.values(route.sharing.userGroups),
            user: route.user,
            created: new Date(route.created || ""),
            lastUpdated: new Date(route.lastUpdated || ""),
            lastUpdatedBy: route.lastUpdatedBy,
        });
    }

    private async getInstances(): Promise<Instance[]> {
        const instances = await this.cache.getOrPromise("instances", async () => {
            const response = await this.api
                .get<{ routes: D2Route[] }>("/routes", {
                    paging: false,
                    fields: "*",
                })
                .getData();

            const instances = response.routes.map(this.buildInstance);

            const instancesWithVersion = await promiseMap(instances, async targetInstance => {
                const d2ApiByInstance = getD2APiFromInstance(this.instance, targetInstance);

                const version = await d2ApiByInstance.system.info
                    .getData()
                    .then(data => data.version)
                    .catch(() => undefined);

                return targetInstance.update({ version });
            });

            return [this.instance, ...instancesWithVersion];
        });

        return instances;
    }

    //TODO: this should not be here, may be a message repository?
    public async sendMessage(message: InstanceMessage): Promise<void> {
        //@ts-ignore https://github.com/EyeSeeTea/d2-api/pull/52
        await this.api.messageConversations.post(message).getData();
    }
}

type D2Route = {
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
export interface D2Sharing {
    access: string;
    displayName: string;
    id: string;
    name?: string;
}

type RouteAuth = {
    type: "http-basic";
    username: string;
    password: string;
};

function slugify(text: string): string {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

function mapArrayToRecord(array: SharingSetting[]): Record<string, SharingSetting> {
    return array.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {} as Record<string, SharingSetting>);
}
