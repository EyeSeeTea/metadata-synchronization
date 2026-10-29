import { Typography } from "@material-ui/core";
import { WmrFlowKind } from "../../../../domain/entities/wmr/entities/WmrFlowKind";
import { WmrFlow } from "../../../../domain/entities/wmr/entities/WmrSettings";
import i18n from "../../../../utils/i18n";

export function getWmrFlowName(kind: WmrFlowKind): string {
    switch (kind) {
        case "global":
            return i18n.t("Global");
        case "regional":
            return i18n.t("Regional");
    }
}

type WmrFlowLabelProps = { flow: WmrFlow };

export function WmrFlowLabel(props: WmrFlowLabelProps) {
    const { kind, source, destination } = props.flow;

    return (
        <Typography variant="subtitle1">
            {i18n.t("{{flow}}: {{source}} ({{sourcePeriodType}}) → {{destination}} ({{destinationPeriodType}})", {
                flow: getWmrFlowName(kind),
                source: source.name,
                sourcePeriodType: source.periodType,
                destination: destination.name,
                destinationPeriodType: destination.periodType,
                nsSeparator: false,
                interpolation: { escapeValue: false },
            })}
        </Typography>
    );
}
