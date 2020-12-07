import { Checkbox, FormControlLabel } from "@material-ui/core";
import { ConfirmationDialog, useSnackbar } from "d2-ui-components";
import React, { useState } from "react";
import { Period } from "../../../../../domain/common/entities/Period";
import i18n from "../../../../../locales";
import PeriodSelection, { ObjectWithPeriod } from "../period-selection/PeriodSelection";

export interface PeriodSelectionDialogProps {
    title?: string;
    period?: Period;
    onClose(): void;
    onSave(period?: Period): void;
}

export const PeriodSelectionDialog: React.FC<PeriodSelectionDialogProps> = ({
    title,
    onClose,
    onSave,
    period,
}) => {
    const snackbar = useSnackbar();
    const [objectWithPeriod, setObjectWithPeriod] = useState<ObjectWithPeriod | undefined>(
        period
            ? {
                  period: period.type,
                  startDate: period.startDate,
                  endDate: period.endDate,
              }
            : undefined
    );

    const handleCheckBoxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            setObjectWithPeriod(undefined);
        } else {
            setObjectWithPeriod({ period: "ALL" });
        }
    };

    const handleSave = () => {
        if (objectWithPeriod) {
            const periodValidation = Period.create({
                type: objectWithPeriod.period,
                startDate: objectWithPeriod.startDate,
                endDate: objectWithPeriod.endDate,
            });

            periodValidation.match({
                error: errors => snackbar.error(errors.map(error => error.description).join("\n")),
                success: period => onSave(period),
            });
        } else {
            onSave(undefined);
        }
    };

    return (
        <ConfirmationDialog
            open={true}
            maxWidth="xs"
            fullWidth={true}
            title={title}
            onCancel={onClose}
            onSave={() => handleSave()}
            cancelText={i18n.t("Cancel")}
            saveText={i18n.t("Save")}
        >
            <FormControlLabel
                control={
                    <Checkbox
                        checked={objectWithPeriod === undefined}
                        onChange={handleCheckBoxChange}
                    />
                }
                label={i18n.t("Use sync rules periods")}
            />

            {objectWithPeriod && (
                <PeriodSelection
                    objectWithPeriod={objectWithPeriod}
                    onChange={setObjectWithPeriod}
                />
            )}
        </ConfirmationDialog>
    );
};
