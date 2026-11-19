import * as fs from "node:fs";
import * as path from "node:path";

const projectRoot = path.resolve(__dirname, "../..");
const templatePath = path.join(projectRoot, "public", "app-config.template.json");
const buildAppConfigPath = path.join(projectRoot, "build", "app-config.json");

export const appConfigTemplateErrors = {
    notAnObject: "it must be a JSON object",
    appKey: "appKey must be a non-empty string",
    showShareButton: "appearance.showShareButton must be a boolean",
    feedback: "feedback must be an object",
    encryptionKey: "encryptionKey must not be in the template. The app does not use it",
} as const;

/**
 * Writes build/app-config.json from the tracked template, replacing the copy Vite made from
 * public/. The ZIP only carries what the app reads.
 */
export function writeAppConfigFromTemplate(): void {
    const template: unknown = JSON.parse(fs.readFileSync(templatePath, "utf8"));
    const errors = getAppConfigTemplateErrors(template);

    if (errors.length > 0) {
        throw new Error(`Invalid public/app-config.template.json: ${errors.join("; ")}`);
    }

    fs.copyFileSync(templatePath, buildAppConfigPath);
    console.debug("Written: build/app-config.json (from public/app-config.template.json)");
}

export function getAppConfigTemplateErrors(template: unknown): ReadonlyArray<string> {
    if (!isRecord(template)) return [appConfigTemplateErrors.notAnObject];

    const { appKey, appearance, feedback } = template;

    const checks: ReadonlyArray<readonly [boolean, string]> = [
        [typeof appKey === "string" && appKey !== "", appConfigTemplateErrors.appKey],
        [
            isRecord(appearance) && typeof appearance.showShareButton === "boolean",
            appConfigTemplateErrors.showShareButton,
        ],
        [isRecord(feedback), appConfigTemplateErrors.feedback],
        [!("encryptionKey" in template), appConfigTemplateErrors.encryptionKey],
    ];

    return checks.filter(([isValid]) => !isValid).map(([, error]) => error);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
