import { Instance } from "../../domain/instance/entities/Instance";
import { AppRoles } from "../../domain/role/AppRoles";
import { User } from "../../domain/user/entities/User";
import { UserRepository } from "../../domain/user/repositories/UserRepository";
import { D2Api, Id } from "../../types/d2-api";
import { getD2APiFromInstance } from "../../utils/d2-utils";
import { NamedRef } from "../../domain/common/entities/Ref";

// DHIS2 2.43 moved `username`/`userRoles` out of the (now removed) `userCredentials` wrapper.
export type CurrentUserRole = NamedRef & { authorities: string[] };
export type CurrentUserResponse = {
    id: Id;
    name: string;
    email: string;
    username: string;
    userRoles?: CurrentUserRole[];
    userGroups: NamedRef[];
    organisationUnits: NamedRef[];
    dataViewOrganisationUnits: NamedRef[];
    userCredentials?: { username?: string; userRoles?: CurrentUserRole[] };
};

export class UserD2ApiRepository implements UserRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    async getCurrent(): Promise<User> {
        const currentUser = await this.api
            .get<CurrentUserResponse>("/me", {
                fields: [
                    "id,name,email",
                    "username,userRoles[:all]",
                    "userCredentials[username,userRoles[:all]]",
                    "userGroups[id,name]",
                    "organisationUnits[id,name]",
                    "dataViewOrganisationUnits[id,name]",
                ].join(","),
            })
            .getData();

        const username = currentUser.userCredentials?.username ?? currentUser.username;
        const userRoles: CurrentUserRole[] = currentUser.userCredentials?.userRoles ?? currentUser.userRoles ?? [];
        const isGlobalAdmin = !!userRoles.find(role => role.authorities.find(authority => authority === "ALL"));

        return {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            username: username,
            userGroups: currentUser.userGroups,
            organisationUnits: currentUser.organisationUnits,
            dataViewOrganisationUnits: currentUser.dataViewOrganisationUnits,
            isGlobalAdmin,
            isAppConfigurator:
                isGlobalAdmin || !!userRoles.find(role => role.name === AppRoles.CONFIGURATION_ACCESS.name),
            isAppExecutor:
                isGlobalAdmin || !!userRoles.find(role => role.name === AppRoles.SYNC_RULE_EXECUTION_ACCESS.name),
        };
    }
}
