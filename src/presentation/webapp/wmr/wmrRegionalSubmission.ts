import { WmrFlowKind } from "../../../domain/entities/wmr/entities/WmrFlowKind";
import i18n from "../../../utils/i18n";

export function getWmrRegionalSubmissionWarning(): string {
    return i18n.t(
        "Regional submission is temporarily unavailable while monthly district reporting is being corrected."
    );
}

export function isWmrRegionalSubmissionAvailable(flowKind: WmrFlowKind | undefined): boolean {
    return flowKind !== "regional";
}
