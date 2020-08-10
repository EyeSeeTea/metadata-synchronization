import { ConfirmationDialog } from "d2-ui-components";
import React, { useEffect, useState } from "react";
import { useHistory, useLocation, useParams } from "react-router-dom";
import { Module } from "../../../../domain/modules/entities/Module";
import i18n from "../../../../locales";
import { useAppContext } from "../../../common/contexts/AppContext";
import { ModuleWizard } from "../../components/module-wizard/ModuleWizard";
import PageHeader from "../../components/page-header/PageHeader";

const ModuleCreationPage: React.FC = () => {
    const { compositionRoot } = useAppContext();
    const history = useHistory();
    const { id, action } = useParams<{ id: string; action: "edit" | "new" }>();
    const location = useLocation<{ module?: Module }>();

    const [dialogOpen, updateDialogOpen] = useState(false);
    const [module, updateModule] = useState(() => location.state?.module);

    const isEdit = action === "edit" && (!!module || !!id);
    const title = !isEdit ? i18n.t(`New module`) : i18n.t(`Edit module`);
    const cancel = !isEdit ? i18n.t(`Cancel module creation`) : i18n.t(`Cancel module editing`);

    const closeDialog = () => updateDialogOpen(false);
    const openDialog = () => updateDialogOpen(true);

    const onClose = () => {
        updateDialogOpen(false);
        history.push(`/modules`);
    };

    useEffect(() => {
        if (!module && !!id) compositionRoot.modules.get(id).then(updateModule);
    }, [compositionRoot, module, id]);

    return (
        <React.Fragment>
            <ConfirmationDialog
                isOpen={dialogOpen}
                onSave={onClose}
                onCancel={closeDialog}
                title={cancel}
                description={i18n.t("All your changes will be lost. Are you sure?")}
                saveText={i18n.t("Ok")}
            />

            <PageHeader title={title} onBackClick={openDialog} />

            {module && (
                <ModuleWizard
                    onCancel={openDialog}
                    onClose={onClose}
                    module={module}
                    onChange={updateModule}
                />
            )}
        </React.Fragment>
    );
};

export default ModuleCreationPage;
