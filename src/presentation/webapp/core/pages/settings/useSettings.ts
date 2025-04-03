import { ConfirmationDialogProps } from "@eyeseetea/d2-ui-components";
import { useCallback, useEffect, useState } from "react";
import { AppStorageType } from "../../../../../domain/storage-client-config/entities/StorageConfig";
import { Settings, SettingsParams } from "../../../../../domain/settings/Settings";
import i18n from "../../../../../utils/i18n";
import { useAppContext } from "../../../../react/core/contexts/AppContext";

type ValidationForm<Form> = {
    [Key in keyof Form]: {
        hasError: boolean;
        message: string;
        value: Form[Key];
    };
};

type SettingsForm = ValidationForm<SettingsParams>;

const initialSettingsForm = {
    historyRetentionDays: { hasError: false, message: "", value: "" },
};

export function useSettings() {
    const { compositionRoot, newCompositionRoot } = useAppContext();

    const [storageType, setStorageType] = useState<AppStorageType>("dataStore");
    const [savedStorageType, setSavedStorageType] = useState<AppStorageType>("dataStore");

    const [settingsForm, setSettingsForm] = useState<SettingsForm>(initialSettingsForm);

    const [dialogProps, updateDialog] = useState<ConfirmationDialogProps | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string | undefined>();
    const [goHome, setGoHome] = useState<boolean>(false);
    const [error, setError] = useState<string | undefined>(undefined);

    useEffect(() => {
        newCompositionRoot.config.getStorageClient.execute().then(storage => {
            setStorageType(storage);
            setSavedStorageType(storage);
        });
    }, [compositionRoot, newCompositionRoot]);

    useEffect(() => {
        compositionRoot.settings.get().then(settings => {
            setSettingsForm({
                historyRetentionDays: {
                    hasError: false,
                    message: "",
                    value: settings.historyRetentionDays?.toString() || "",
                },
            });
        });
    }, [compositionRoot]);

    const changeStorage = useCallback(
        async (storage: AppStorageType) => {
            setLoadingMessage(i18n.t("Updating storage location, please wait..."));
            await newCompositionRoot.config.setStorageClient.execute(storage);

            const newStorage = await newCompositionRoot.config.getStorageClient.execute();
            setStorageType(newStorage);
            setLoadingMessage(undefined);
            setGoHome(true);
        },
        [newCompositionRoot]
    );

    const saveSettings = useCallback(() => {
        const settings = Settings.create({
            historyRetentionDays: settingsForm.historyRetentionDays.value,
        }).getOrThrow();

        compositionRoot.settings
            .save(settings)
            .then(() => setGoHome(true))
            .catch(error => {
                setError(`${i18n.t("An error has occurred saving settings")}:${error}`);
            });
    }, [compositionRoot.settings, settingsForm.historyRetentionDays.value]);

    const showConfirmationDialog = useCallback(() => {
        updateDialog({
            title: i18n.t("Change storage"),
            description: i18n.t(
                "When changing the storage of the application, all stored information will be moved to the new storage. This might take a while, please wait. Do you want to proceed?"
            ),
            onCancel: () => {
                updateDialog(null);
            },
            onSave: async () => {
                updateDialog(null);
                await changeStorage(storageType);
                saveSettings();
            },
            cancelText: i18n.t("Cancel"),
            saveText: i18n.t("Proceed"),
        });
    }, [changeStorage, saveSettings, storageType]);

    const onChangeStorageType = useCallback((storage: AppStorageType) => setStorageType(storage), []);

    const onChangeSettings = useCallback((settings: SettingsParams) => {
        const settingsValidation = Settings.create({ historyRetentionDays: settings.historyRetentionDays });

        settingsValidation.match({
            success: () =>
                setSettingsForm({
                    historyRetentionDays: { hasError: false, message: "", value: settings.historyRetentionDays },
                }),
            error: errors => {
                const historyRetentionDaysError = errors.find(error => error.property === "historyRetentionDays");

                setSettingsForm({
                    historyRetentionDays: {
                        hasError: historyRetentionDaysError !== undefined,
                        message: historyRetentionDaysError?.description || "",
                        value: settings.historyRetentionDays,
                    },
                });
            },
        });
    }, []);

    const onSave = useCallback(() => {
        if (storageType !== savedStorageType) {
            showConfirmationDialog();
        } else {
            saveSettings();
        }
    }, [saveSettings, savedStorageType, showConfirmationDialog, storageType]);

    const onCancel = useCallback(() => setGoHome(true), []);

    return {
        storageType,
        settingsForm,
        onChangeStorageType,
        onChangeSettings,
        onCancel,
        onSave,
        dialogProps,
        loadingMessage,
        goHome,
        error,
    };
}
