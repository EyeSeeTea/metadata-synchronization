import { Box, ButtonBase, Chip, Grid, Typography } from "@material-ui/core";
import { ChevronRight as ChevronRightIcon } from "@material-ui/icons";
import React from "react";
import { WmrFlowKind, wmrFlowKinds } from "../../../../domain/entities/wmr/entities/WmrFlowKind";
import { Maybe } from "../../../../types/utils";
import i18n from "../../../../utils/i18n";
import { muiTheme } from "../../../react/core/themes/dhis2.theme";
import { getWmrFlowName } from "./WmrFlowLabel";

type WmrFlowTexts = Readonly<{ title: string; chip: string; route: ReadonlyArray<string> }>;

function getFlowTexts(kind: WmrFlowKind): WmrFlowTexts {
    switch (kind) {
        case "global":
            return {
                title: getWmrFlowName(kind),
                chip: i18n.t("Yearly"),
                route: [
                    i18n.t("Data is entered yearly at the country"),
                    i18n.t("Copied as is to MAL - WMR Form - Country Sync"),
                    i18n.t("Sent to one organisation unit of the target instance"),
                ],
            };
        case "regional":
            return {
                title: getWmrFlowName(kind),
                chip: i18n.t("Monthly"),
                route: [
                    i18n.t("Data is entered monthly in the country"),
                    i18n.t("Stored per month for each output organisation unit"),
                    i18n.t("Sent with organisation unit mapping"),
                ],
            };
    }
}

export type WmrFlowSelectorProps = Readonly<{
    value: Maybe<WmrFlowKind>;
    onChange: (kind: WmrFlowKind) => void;
}>;

export function WmrFlowSelector({ value, onChange }: WmrFlowSelectorProps) {
    return (
        <Grid container spacing={2}>
            {wmrFlowKinds.map(kind => {
                const { title, chip, route } = getFlowTexts(kind);
                const selected = kind === value;
                const { primary, divider } = muiTheme.palette;
                return (
                    <Grid item xs={12} md={6} key={kind}>
                        <ButtonBase
                            aria-pressed={selected}
                            onClick={() => onChange(kind)}
                            style={{
                                display: "block",
                                width: "100%",
                                height: "100%",
                                textAlign: "left",
                                padding: 16,
                                borderRadius: 8,
                                border: `2px solid ${selected ? primary.main : divider}`,
                                background: selected ? `${primary.main}14` : undefined,
                            }}
                        >
                            <Box component="span" display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="h6" component="span">
                                    {title}
                                </Typography>
                                <Chip component="span" size="small" label={chip} variant="outlined" />
                            </Box>
                            <Box component="span" display="block" mt={1.25}>
                                {route.map(step => (
                                    <Box component="span" key={step} display="flex" alignItems="center">
                                        <ChevronRightIcon fontSize="small" color="primary" />
                                        <Typography variant="body2" color="textSecondary" component="span">
                                            {step}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </ButtonBase>
                    </Grid>
                );
            })}
        </Grid>
    );
}
