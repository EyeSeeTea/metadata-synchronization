import { Typography } from "@material-ui/core";
import { WmrFlow } from "../../../../domain/entities/wmr/entities/WmrSettings";
import i18n from "../../../../utils/i18n";

type WmrFlowLabelProps = { flow: WmrFlow };

export function WmrFlowLabel(props: WmrFlowLabelProps) {
    const { source, destination } = props.flow;

    return (
        <Typography variant="subtitle1">
            {i18n.t("{{source}} ({{sourcePeriodType}}) → {{destination}} ({{destinationPeriodType}})", {
                source: source.name,
                sourcePeriodType: source.periodType,
                destination: destination.name,
                destinationPeriodType: destination.periodType,
            })}
        </Typography>
    );
}
