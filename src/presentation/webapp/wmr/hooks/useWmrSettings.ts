import { useSnackbar } from "@eyeseetea/d2-ui-components";
import React from "react";
import { WmrSettings } from "../../../../domain/entities/wmr/entities/WmrSettings";
import { useAppContext } from "../../../react/core/contexts/AppContext";

export function useWmrSettings() {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const [settings, setSettings] = React.useState<WmrSettings>(
        new WmrSettings({ countryDataSetId: "", dataSets: [], countryDataElementsIds: [] })
    );

    React.useEffect(() => {
        async function getSettings() {
            compositionRoot.wmr
                .settings()
                .then(setSettings)
                .catch(err => {
                    snackbar.error(err.message);
                });
        }

        getSettings();
    }, [compositionRoot, snackbar]);

    return { settings };
}
