import { Server } from "miragejs";
import { Instance } from "../../../domain/instance/entities/Instance";
import { startDhis } from "../../../utils/dhisServer";
import { SystemInfoD2ApiRepository } from "../SystemInfoD2ApiRepository";

const baseUrl = "http://origin.test";
const rawLastAnalyticsTableSuccess = "2026-09-23T04:00:00.030";
const unknownTimeZoneId = "Mars/Olympus_Mons";

const localInstance = Instance.build({ url: baseUrl, name: "Testing", version: "2.40", type: "local" });

describe("SystemInfoD2ApiRepository", () => {
    let server: Server;

    beforeEach(() => {
        server = startDhis({ urlPrefix: baseUrl });
    });

    afterEach(() => {
        server.shutdown();
    });

    describe("get", () => {
        it("reads the naive analytics timestamp as an instant in the server time zone when the server runs on UTC", async () => {
            const repository = buildRepository({
                serverTimeZoneId: "Etc/UTC",
                lastAnalyticsTableSuccess: rawLastAnalyticsTableSuccess,
            });

            const { lastAnalyticsTableSuccess } = await repository.get();

            expect(lastAnalyticsTableSuccess?.toISOString()).toBe("2026-09-23T04:00:00.030Z");
        });

        it("reads the naive analytics timestamp as an instant in the server time zone when the server runs off UTC", async () => {
            const repository = buildRepository({
                serverTimeZoneId: "America/Bogota",
                lastAnalyticsTableSuccess: rawLastAnalyticsTableSuccess,
            });

            const { lastAnalyticsTableSuccess } = await repository.get();

            expect(lastAnalyticsTableSuccess?.toISOString()).toBe("2026-09-23T09:00:00.030Z");
        });

        it("returns no analytics timestamp when the server reports none", async () => {
            const repository = buildRepository({ serverTimeZoneId: "Etc/UTC" });

            const { lastAnalyticsTableSuccess } = await repository.get();

            expect(lastAnalyticsTableSuccess).toBe(undefined);
        });

        it("fails instead of guessing an instant when the server time zone is unknown", async () => {
            const repository = buildRepository({
                serverTimeZoneId: unknownTimeZoneId,
                lastAnalyticsTableSuccess: rawLastAnalyticsTableSuccess,
            });

            await expect(repository.get()).rejects.toThrow(`Unknown DHIS2 server time zone: ${unknownTimeZoneId}`);
        });

        it("fails instead of guessing an instant when the server reports no time zone", async () => {
            const repository = buildRepository({ lastAnalyticsTableSuccess: rawLastAnalyticsTableSuccess });

            await expect(repository.get()).rejects.toThrow("Unknown DHIS2 server time zone: undefined");
        });
    });

    function buildRepository(systemInfo: Record<string, unknown>): SystemInfoD2ApiRepository {
        server.get("/system/info", async () => ({ version: "2.40", ...systemInfo }));
        return new SystemInfoD2ApiRepository(localInstance);
    }
});
