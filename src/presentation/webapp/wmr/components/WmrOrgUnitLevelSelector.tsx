import { Box, Button } from "@material-ui/core";
import { Dropdown } from "@eyeseetea/d2-ui-components";
import React from "react";
import { WmrLevelAssignment } from "../../../../domain/entities/wmr/entities/WmrOrgUnits";
import i18n from "../../../../utils/i18n";
import { getSelectedLevel, useWmrOrgUnitLevel, WmrLevelSelection } from "../hooks/useWmrOrgUnitLevel";
import { NoticeBox } from "./NoticeBox";

function getAssignmentCounts({ orgUnits }: WmrLevelAssignment) {
    return { assigned: orgUnits.length };
}

function SelectionNotice({ selection }: { selection: WmrLevelSelection }) {
    switch (selection.type) {
        case "none":
            return null;
        case "loading":
            return <NoticeBox type="loading" message={i18n.t("Loading organisation units...")} />;
        case "preview":
        case "assigning":
            return (
                <NoticeBox
                    type="info"
                    message={i18n.t(
                        "{{assigned}} organisation units will be assigned and used directly as the output level.",
                        getAssignmentCounts(selection.assignment)
                    )}
                />
            );
        case "assigned":
            return (
                <NoticeBox
                    type="success"
                    message={i18n.t(
                        "{{assigned}} organisation units are assigned and used directly as the output level.",
                        getAssignmentCounts(selection.assignment)
                    )}
                />
            );
    }
}

export function WmrOrgUnitLevelSelector() {
    const { levels, selection, error, selectLevel, assignLevel } = useWmrOrgUnitLevel();

    if (!levels) {
        return error ? (
            <NoticeBox type="error" message={error} />
        ) : (
            <NoticeBox type="loading" message={i18n.t("Loading organisation unit levels...")} />
        );
    }

    const items = levels.map(({ level, name, count }) => ({
        value: String(level),
        text: i18n.t("{{name}} (level {{level}}) · {{count}} org units", {
            name,
            level,
            count,
            interpolation: { escapeValue: false },
        }),
    }));
    const selectedLevel = getSelectedLevel(selection);

    return (
        <Box>
            <Box display="flex" flexWrap="wrap" alignItems="flex-end">
                <Box minWidth={280} mr={2}>
                    <Dropdown
                        items={items}
                        label={i18n.t("Organisation unit level")}
                        value={selectedLevel === undefined ? "" : String(selectedLevel)}
                        onChange={value => selectLevel(value ? Number(value) : undefined)}
                    />
                </Box>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={assignLevel}
                    disabled={selection.type !== "preview"}
                >
                    {i18n.t("Assign")}
                </Button>
            </Box>
            <SelectionNotice selection={selection} />
            {error && <NoticeBox type="error" message={error} />}
        </Box>
    );
}
