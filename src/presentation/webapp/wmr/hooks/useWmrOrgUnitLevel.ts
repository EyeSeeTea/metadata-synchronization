import React from "react";
import { Future } from "../../../../domain/common/entities/Future";
import { WmrLevelAssignment, WmrOrgUnitLevel } from "../../../../domain/entities/wmr/entities/WmrOrgUnits";
import { wmrRequisites } from "../../../../domain/entities/wmr/entities/WmrRequisite";
import { Maybe } from "../../../../types/utils";
import { useAppContext } from "../../../react/core/contexts/AppContext";
import { useWmrContext } from "../context/WmrContext";

export type WmrLevelSelection =
    | Readonly<{ type: "none" }>
    | Readonly<{ type: "loading"; level: number }>
    | Readonly<{ type: "preview" | "assigning" | "assigned"; assignment: WmrLevelAssignment }>;

export function getSelectedLevel(selection: WmrLevelSelection): Maybe<number> {
    switch (selection.type) {
        case "none":
            return undefined;
        case "loading":
            return selection.level;
        case "preview":
        case "assigning":
        case "assigned":
            return selection.assignment.level;
    }
}

export function useWmrOrgUnitLevel() {
    const { compositionRoot } = useAppContext();
    const { setRegionalParents } = useWmrContext();
    const [levels, setLevels] = React.useState<ReadonlyArray<WmrOrgUnitLevel>>();
    const [selection, setSelection] = React.useState<WmrLevelSelection>({ type: "none" });
    const [error, setError] = React.useState<Maybe<string>>();

    React.useEffect(() => {
        return Future.joinObj({
            levels: compositionRoot.wmr.getOrgUnitLevels(),
            assignment: compositionRoot.wmr.getAssignedOrgUnits(wmrRequisites.countryFormMonthly.code),
        }).run(
            ({ levels, assignment }) => {
                setLevels(levels);
                setSelection(assignment ? { type: "assigned", assignment } : { type: "none" });
                setRegionalParents(assignment?.parents ?? []);
            },
            error => setError(error.message)
        );
    }, [compositionRoot.wmr, setRegionalParents]);

    const selectLevel = React.useCallback(
        (level: number | undefined) => {
            setError(undefined);
            if (level === undefined) {
                setSelection({ type: "none" });
                return;
            }
            setSelection({ type: "loading", level });
            compositionRoot.wmr.getLevelOrgUnits(level).run(
                assignment =>
                    setSelection(current =>
                        current.type === "loading" && current.level === level
                            ? { type: "preview", assignment }
                            : current
                    ),
                error => setError(error.message)
            );
        },
        [compositionRoot.wmr]
    );

    const assignLevel = React.useCallback(() => {
        if (selection.type !== "preview") return;
        const { assignment } = selection;
        setError(undefined);
        setSelection({ type: "assigning", assignment });
        compositionRoot.wmr.assignOrgUnitLevel(assignment.level).run(
            () => {
                setSelection({ type: "assigned", assignment });
                setRegionalParents(assignment.parents);
            },
            error => {
                setSelection({ type: "preview", assignment });
                setError(error.message);
            }
        );
    }, [compositionRoot.wmr, selection, setRegionalParents]);

    return { levels, selection, error, selectLevel, assignLevel };
}
