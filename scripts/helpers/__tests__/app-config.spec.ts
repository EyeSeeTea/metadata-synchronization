import trackedTemplate from "../../../public/app-config.template.json";
import { appConfigTemplateErrors, getAppConfigTemplateErrors } from "../app-config";

const validTemplate = {
    appKey: "metadata-synchronization",
    appearance: { showShareButton: false },
    feedback: { repositories: {}, layoutOptions: {} },
};

function buildTemplate(overrides: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
    return { ...validTemplate, ...overrides };
}

describe("getAppConfigTemplateErrors", () => {
    describe("valid templates", () => {
        it("accepts the tracked public/app-config.template.json", () => {
            expect(getAppConfigTemplateErrors(trackedTemplate)).toEqual([]);
        });

        it("accepts a template with only the fields the app reads", () => {
            expect(getAppConfigTemplateErrors(validTemplate)).toEqual([]);
        });
    });

    describe("encryption key", () => {
        it("rejects a template with a key", () => {
            const template = buildTemplate({ encryptionKey: "fake-test-key" });

            expect(getAppConfigTemplateErrors(template)).toEqual([appConfigTemplateErrors.encryptionKey]);
        });

        it("rejects a template with an empty key field", () => {
            const template = buildTemplate({ encryptionKey: "" });

            expect(getAppConfigTemplateErrors(template)).toEqual([appConfigTemplateErrors.encryptionKey]);
        });
    });

    describe("structure", () => {
        it("rejects a template that is not a JSON object", () => {
            expect(getAppConfigTemplateErrors([])).toEqual([appConfigTemplateErrors.notAnObject]);
        });

        it("reports every missing field", () => {
            expect(getAppConfigTemplateErrors({})).toEqual([
                appConfigTemplateErrors.appKey,
                appConfigTemplateErrors.showShareButton,
                appConfigTemplateErrors.feedback,
            ]);
        });

        it("rejects an empty appKey", () => {
            const template = buildTemplate({ appKey: "" });

            expect(getAppConfigTemplateErrors(template)).toEqual([appConfigTemplateErrors.appKey]);
        });

        it("rejects a showShareButton that is not a boolean", () => {
            const template = buildTemplate({ appearance: { showShareButton: "no" } });

            expect(getAppConfigTemplateErrors(template)).toEqual([appConfigTemplateErrors.showShareButton]);
        });
    });
});
