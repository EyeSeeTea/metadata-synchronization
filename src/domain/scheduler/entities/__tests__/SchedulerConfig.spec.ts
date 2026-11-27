import { Right } from "purify-ts";
import { ConfigModel } from "../SchedulerConfig";

const schedulerConfig = {
    baseUrl: "https://dhis2.example.org",
    username: "fake-user",
    password: "fake-password",
};

describe("ConfigModel", () => {
    it("decodes a configuration file without encryptionKey", () => {
        expect(ConfigModel.decode(schedulerConfig)).toEqual(Right(schedulerConfig));
    });

    it("still decodes a legacy configuration file with encryptionKey, dropping it", () => {
        const legacyConfig = { ...schedulerConfig, encryptionKey: "fake-legacy-key" };

        expect(ConfigModel.decode(legacyConfig)).toEqual(Right(schedulerConfig));
    });

    it("rejects a configuration file without password", () => {
        const { baseUrl, username } = schedulerConfig;

        expect(ConfigModel.decode({ baseUrl, username }).isLeft()).toBe(true);
    });
});
