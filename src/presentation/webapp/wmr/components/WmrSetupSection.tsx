import { Box, Typography } from "@material-ui/core";
import { Lock as LockIcon } from "@material-ui/icons";
import React from "react";
import { muiTheme } from "../../../react/core/themes/dhis2.theme";

export type WmrSetupSectionProps = Readonly<{
    number: number;
    title: string;
    hint: string;
    locked: boolean;
    lockNote?: string;
    children: React.ReactNode;
}>;

export function WmrSetupSection({ number, title, hint, locked, lockNote, children }: WmrSetupSectionProps) {
    const titleId = `wmr-setup-section-${number}`;

    return (
        <Box
            component="section"
            aria-labelledby={titleId}
            aria-disabled={locked}
            py={2.5}
            borderTop={number > 1 ? `1px solid ${muiTheme.palette.divider}` : undefined}
        >
            {locked && lockNote && (
                <Box display="flex" alignItems="center" ml={5} mb={1} color="text.secondary">
                    <LockIcon style={{ fontSize: 14, marginRight: 4 }} />
                    <Typography variant="caption">{lockNote}</Typography>
                </Box>
            )}
            <Box display="flex" alignItems="baseline" mb={1.5}>
                <Box
                    flex="none"
                    width={26}
                    height={26}
                    mr={1.5}
                    borderRadius="50%"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    bgcolor={locked ? "action.disabledBackground" : "primary.main"}
                    color={locked ? "text.disabled" : "primary.contrastText"}
                    fontWeight="bold"
                    fontSize={13}
                >
                    {number}
                </Box>
                <Box>
                    <Typography id={titleId} variant="h6" component="h2">
                        {title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {hint}
                    </Typography>
                </Box>
            </Box>
            <Box ml={5} style={locked ? { opacity: 0.55, pointerEvents: "none" } : undefined}>
                {children}
            </Box>
        </Box>
    );
}
