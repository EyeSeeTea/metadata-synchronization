import { Dropdown } from "@eyeseetea/d2-ui-components";
import React from "react";
import { Id } from "../../../../domain/common/entities/Schemas";
import { wmrRequisites } from "../../../../domain/entities/wmr/entities/WmrRequisite";
import { Instance } from "../../../../domain/instance/entities/Instance";
import { getD2APiFromInstance } from "../../../../utils/d2-utils";
import i18n from "../../../../utils/i18n";
import { useAppContext } from "../../../react/core/contexts/AppContext";
import { NoticeBox } from "./NoticeBox";

type TargetDataSet = Readonly<{ id: Id; name: string }>;

const stagingDataSetCode = wmrRequisites.regionalMonthlyStaging.code;

type WmrTargetDataSetSelectorProps = Readonly<{
    instance: Instance;
    value: Id | undefined;
    onChange: (dataSetId: Id | undefined) => void;
}>;

export function WmrTargetDataSetSelector({ instance, value, onChange }: WmrTargetDataSetSelectorProps) {
    const { compositionRoot } = useAppContext();
    const [dataSets, setDataSets] = React.useState<ReadonlyArray<TargetDataSet>>();
    const [error, setError] = React.useState<string>();

    React.useEffect(() => {
        let cancelled = false;
        setDataSets(undefined);
        setError(undefined);

        const api = getD2APiFromInstance(compositionRoot.localInstance, instance);
        api.models.dataSets
            .get({
                fields: {
                    id: true,
                    code: true,
                    displayName: true,
                    periodType: true,
                    access: { data: { write: true } },
                },
                order: "displayName:asc",
                paging: false,
            })
            .getData()
            .then(response => {
                if (!cancelled) {
                    setDataSets(
                        response.objects
                            .filter(
                                ({ code, periodType, access }) =>
                                    periodType === "Monthly" &&
                                    access.data?.write === true &&
                                    code !== stagingDataSetCode
                            )
                            .map(({ id, displayName }) => ({ id, name: displayName }))
                    );
                }
            })
            .catch(loadError => {
                if (!cancelled) setError(loadError instanceof Error ? loadError.message : String(loadError));
            });

        return () => {
            cancelled = true;
        };
    }, [compositionRoot.localInstance, instance]);

    if (error) {
        return (
            <NoticeBox
                type="error"
                message={i18n.t("Could not load Monthly data sets: {{error}}", {
                    error,
                    nsSeparator: false,
                    interpolation: { escapeValue: false },
                })}
            />
        );
    }
    if (!dataSets)
        return <NoticeBox type="loading" message={i18n.t("Loading Monthly data sets from the target instance...")} />;
    if (dataSets.length === 0) {
        return (
            <NoticeBox
                type="error"
                message={i18n.t(
                    "No writable Monthly data sets were found on the target instance. Ask an administrator for data write access to an AFRO Monthly data set."
                )}
            />
        );
    }

    return (
        <Dropdown
            items={dataSets.map(dataSet => ({ value: dataSet.id, text: dataSet.name }))}
            label={i18n.t("AFRO Monthly data set")}
            value={value ?? ""}
            onChange={dataSetId => onChange(dataSetId || undefined)}
        />
    );
}
