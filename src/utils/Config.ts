import { Maybe } from "../types/utils";

export class Config {
    private static instance: Config;
    private constructor() {}

    public static getInstance(): Config {
        if (!Config.instance) {
            Config.instance = new Config();
        }
        return Config.instance;
    }

    get mode(): string {
        return import.meta.env.MODE;
    }

    get isDevelopment(): boolean {
        return this.mode === "development";
    }

    get presentationTitle(): Maybe<string> {
        return import.meta.env.VITE_PRESENTATION_TITLE;
    }

    get presentationVariant(): Maybe<string> {
        return import.meta.env.VITE_PRESENTATION_VARIANT;
    }

    /**
     * returns the presentationVariant only if it's a valid AppVariant
     */
    get appPresentationVariant(): Maybe<AppVariant> {
        const variant = this.presentationVariant;
        return this.isValidAppVariant(variant) ? variant : undefined;
    }

    get presentationType(): Maybe<PresentationType> {
        const type = import.meta.env.VITE_PRESENTATION_TYPE;
        return type === "webapp" || type === "widget" ? type : undefined;
    }

    get isCypressEnabled(): boolean {
        return Boolean(import.meta.env.VITE_CYPRESS);
    }

    private isValidAppVariant(variant: Maybe<string>): variant is AppVariant {
        return !!variant && (APP_VARIANTS as Readonly<string[]>).includes(variant);
    }
}

const APP_VARIANTS = [
    "core-app",
    "data-metadata-app",
    "module-package-app",
    "msf-aggregate-data-app",
    "sp-emergency-responses",
] as const;

export type AppVariant = typeof APP_VARIANTS[number];

export type PresentationType = "webapp" | "widget";

export const config = Config.getInstance();
