import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WmrContext, WmrContextState } from "../WmrContext";
import { WmrProvider } from "../WmrProvider";

vi.mock("@eyeseetea/d2-ui-components", () => ({ useSnackbar: () => ({ error: vi.fn() }) }));
vi.mock("../../../../react/core/contexts/AppContext", () => ({
    useAppContext: () => ({ compositionRoot: { wmr: { settings: vi.fn().mockResolvedValue(undefined) } } }),
}));

const container = document.createElement("div");
let context: WmrContextState | undefined;

function Probe() {
    context = React.useContext(WmrContext) ?? undefined;
    return null;
}

describe("WmrProvider", () => {
    afterEach(() => {
        act(() => {
            ReactDOM.unmountComponentAtNode(container);
        });
        context = undefined;
    });

    it("keeps wrapped setter identities stable and invalidates preparation when values change", () => {
        act(() => {
            ReactDOM.render(<WmrProvider><Probe /></WmrProvider>, container);
        });
        const initialSetters = {
            outputUnits: context?.setRegionalOutputOrgUnits,
            targetInstance: context?.setTargetInstance,
            mapping: context?.setOrgUnitMapping,
            monthRange: context?.setRegionalMonthRange,
        };

        act(() => {
            context?.setRegionalPrepared(true);
        });
        expect(context?.regionalPrepared).toBe(true);
        act(() => {
            context?.setRegionalOutputOrgUnits([]);
        });
        expect(context?.regionalPrepared).toBe(false);

        act(() => {
            ReactDOM.render(<WmrProvider><Probe /></WmrProvider>, container);
        });
        expect(context?.setRegionalOutputOrgUnits).toBe(initialSetters.outputUnits);
        expect(context?.setTargetInstance).toBe(initialSetters.targetInstance);
        expect(context?.setOrgUnitMapping).toBe(initialSetters.mapping);
        expect(context?.setRegionalMonthRange).toBe(initialSetters.monthRange);
    });

    it("clears the selected destination dataset and preparation when target instance changes", () => {
        act(() => {
            ReactDOM.render(<WmrProvider><Probe /></WmrProvider>, container);
        });
        act(() => {
            context?.setTargetDataSetId("selected-dataset");
            context?.setRegionalPrepared(true);
        });
        expect(context?.targetDataSetId).toBe("selected-dataset");

        act(() => {
            context?.setTargetInstance(undefined);
        });

        expect(context?.targetDataSetId).toBeUndefined();
        expect(context?.regionalPrepared).toBe(false);
    });
});
