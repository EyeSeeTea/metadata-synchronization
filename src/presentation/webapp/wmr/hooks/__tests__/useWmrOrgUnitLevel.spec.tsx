import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Future } from "../../../../../domain/common/entities/Future";
import { wmrRequisites } from "../../../../../domain/entities/wmr/entities/WmrRequisite";
import { useWmrOrgUnitLevel, WmrLevelSelection } from "../useWmrOrgUnitLevel";

const mocks = vi.hoisted(() => ({
    getOrgUnitLevels: vi.fn(),
    getAssignedOrgUnits: vi.fn(),
    setRegionalOutputOrgUnits: vi.fn(),
}));

vi.mock("../../../../react/core/contexts/AppContext", () => {
    const wmr = {
        getOrgUnitLevels: mocks.getOrgUnitLevels,
        getAssignedOrgUnits: mocks.getAssignedOrgUnits,
    };
    return { useAppContext: () => ({ compositionRoot: { wmr } }) };
});
vi.mock("../../context/WmrContext", () => ({
    useWmrContext: () => ({ setRegionalOutputOrgUnits: mocks.setRegionalOutputOrgUnits }),
}));

const container = document.createElement("div");
let renderedSelection: WmrLevelSelection | undefined;

function HookProbe() {
    const { selection } = useWmrOrgUnitLevel();
    renderedSelection = selection;
    return null;
}

describe("useWmrOrgUnitLevel", () => {
    afterEach(() => {
        act(() => {
            ReactDOM.unmountComponentAtNode(container);
        });
        renderedSelection = undefined;
        vi.clearAllMocks();
    });

    it("reopens setup with the staging assignments and selected output units", async () => {
        const assignment = {
            level: 3,
            orgUnits: [{ id: "district-1", path: "/country/district-1" }],
        };
        mocks.getOrgUnitLevels.mockReturnValue(Future.success([]));
        mocks.getAssignedOrgUnits.mockReturnValue(Future.success(assignment));

        await act(async () => {
            ReactDOM.render(<HookProbe />, container);
            await Promise.resolve();
        });

        expect(mocks.getAssignedOrgUnits).toHaveBeenCalledWith(wmrRequisites.regionalMonthlyStaging.code);
        expect(mocks.getAssignedOrgUnits).not.toHaveBeenCalledWith(wmrRequisites.countryFormMonthly.code);
        expect(renderedSelection).toEqual({ type: "assigned", assignment });
        expect(mocks.setRegionalOutputOrgUnits).toHaveBeenCalledWith(assignment.orgUnits);
    });
});
