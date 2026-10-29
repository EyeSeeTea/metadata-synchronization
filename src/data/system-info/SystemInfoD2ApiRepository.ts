import moment from "moment-timezone";

import { Instance } from "../../domain/instance/entities/Instance";
import { SystemInfo } from "../../domain/system-info/entities/SystemInfo";
import { D2Api } from "../../types/d2-api";
import { getD2APiFromInstance } from "../../utils/d2-utils";
import { SystemSettingsRepository } from "../../domain/system-info/repositories/SystemInfoRepository";
import { Maybe } from "../../types/utils";

export class SystemInfoD2ApiRepository implements SystemSettingsRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    public async get(): Promise<SystemInfo> {
        const { lastAnalyticsTableSuccess, serverTimeZoneId } = await this.api.system.info.getData();

        return { lastAnalyticsTableSuccess: parseServerInstant(lastAnalyticsTableSuccess, serverTimeZoneId) };
    }
}

// d2-api types lastAnalyticsTableSuccess as Date, but JSON carries a naive string in the local time zone of the DHIS2 server.
function parseServerInstant(rawDate: unknown, serverTimeZoneId: Maybe<string>): Date | undefined {
    if (typeof rawDate !== "string" || rawDate === "") return undefined;

    if (!serverTimeZoneId || !moment.tz.zone(serverTimeZoneId)) {
        throw new Error(`Unknown DHIS2 server time zone: ${serverTimeZoneId}`);
    }

    return moment.tz(rawDate, serverTimeZoneId).toDate();
}
