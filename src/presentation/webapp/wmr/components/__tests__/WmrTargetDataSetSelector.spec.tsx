import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WmrTargetDataSetSelector } from "../WmrTargetDataSetSelector";

const mocks = vi.hoisted(() => ({
    getData: vi.fn(),
    getDataSetQuery: vi.fn(),
    onChange: vi.fn(),
    getD2APiFromInstance: vi.fn(),
    localInstance: { id: "local" },
}));

vi.mock("../../../../../utils/d2-utils", () => ({ getD2APiFromInstance: mocks.getD2APiFromInstance }));
vi.mock("../../../../react/core/contexts/AppContext", () => ({
    useAppContext: () => ({ compositionRoot: { localInstance: mocks.localInstance } }),
}));
vi.mock("../../../../../utils/i18n", () => ({
    default: {
        t: (message: string, options?: { error?: string }) =>
            message.replace("{{error}}", options?.error ?? "{{error}}"),
    },
}));
vi.mock("@eyeseetea/d2-ui-components", () => ({
    Dropdown: ({
        items,
        value,
        onChange,
    }: {
        items: Array<{ value: string; text: string }>;
        value: string;
        onChange: (value: string) => void;
    }) => (
        <select aria-label="AFRO Monthly data set" value={value} onChange={event => onChange(event.target.value)}>
            {items.map(item => (
                <option key={item.value} value={item.value}>
                    {item.text}
                </option>
            ))}
        </select>
    ),
}));
vi.mock("../NoticeBox", () => ({
    NoticeBox: ({ type, message }: { type: string; message?: string }) => <div data-type={type}>{message}</div>,
}));

const container = document.createElement("div");
const localInstance = mocks.localInstance as never;
const instanceA = { id: "target-a" } as never;
const instanceB = { id: "target-b" } as never;
const writeAccess = { data: { write: true } };
const monthlyDataSets = [
    {
        id: "writable",
        code: "AFR_MONTHLY",
        displayName: "Writable monthly",
        periodType: "Monthly",
        access: writeAccess,
    },
    { id: "yearly", code: "AFR_YEARLY", displayName: "Writable yearly", periodType: "Yearly", access: writeAccess },
    {
        id: "readonly",
        code: "AFR_READONLY",
        displayName: "Read only monthly",
        periodType: "Monthly",
        access: { data: { write: false } },
    },
    { id: "missing", code: "AFR_NO_ACCESS", displayName: "No access details", periodType: "Monthly", access: {} },
    {
        id: "staging",
        code: "MAL_WMR_REGIONAL_MONTHLY_SYNC",
        displayName: "MAL - WMR Regional Monthly Sync",
        periodType: "Monthly",
        access: writeAccess,
    },
];

function render(instance = instanceA) {
    act(() => {
        ReactDOM.render(
            <WmrTargetDataSetSelector instance={instance} value={undefined} onChange={mocks.onChange} />,
            container
        );
    });
}

async function settle() {
    await act(async () => {
        await Promise.resolve();
    });
}

beforeEach(() => {
    mocks.getData.mockReset();
    mocks.getDataSetQuery.mockReset();
    mocks.onChange.mockReset();
    mocks.getD2APiFromInstance.mockReset();
    mocks.getD2APiFromInstance.mockReturnValue({
        models: { dataSets: { get: mocks.getDataSetQuery.mockReturnValue({ getData: mocks.getData }) } },
    });
});

afterEach(() => {
    act(() => {
        ReactDOM.unmountComponentAtNode(container);
    });
});

describe("WmrTargetDataSetSelector", () => {
    it("offers only writable Monthly data sets other than the local staging one and allows selecting one", async () => {
        mocks.getData.mockResolvedValue({ objects: monthlyDataSets });
        render();
        await settle();

        expect(mocks.getD2APiFromInstance).toHaveBeenCalledWith(localInstance, instanceA);
        expect(mocks.getDataSetQuery).toHaveBeenCalledWith({
            fields: {
                id: true,
                code: true,
                displayName: true,
                periodType: true,
                access: { data: { write: true } },
            },
            order: "displayName:asc",
            paging: false,
        });
        const options = Array.from(container.querySelectorAll("option")).map(option => [
            option.value,
            option.textContent,
        ]);
        expect(options).toEqual([["writable", "Writable monthly"]]);
        const select = container.querySelector("select");
        expect(select).not.toBeNull();
        act(() => {
            select!.value = "writable";
            select!.dispatchEvent(new Event("change", { bubbles: true }));
        });
        expect(mocks.onChange).toHaveBeenCalledWith("writable");
    });

    it("explains that an administrator must grant write access when no writable Monthly data set exists", async () => {
        mocks.getData.mockResolvedValue({ objects: monthlyDataSets.slice(1) });
        render();
        await settle();

        expect(container.textContent).toBe(
            "No writable Monthly data sets were found on the target instance. Ask an administrator for data write access to an AFRO Monthly data set."
        );
    });

    it("shows a clear contextual message when the target query fails", async () => {
        mocks.getData.mockRejectedValue(new Error("Network unavailable"));
        render();
        await settle();

        expect(container.textContent).toBe("Could not load Monthly data sets: Network unavailable");
    });

    it("ignores a late response from the previous target instance", async () => {
        let resolveA: ((value: { objects: typeof monthlyDataSets }) => void) | undefined;
        mocks.getData
            .mockImplementationOnce(() => new Promise(resolve => (resolveA = resolve)))
            .mockResolvedValueOnce({
                objects: [
                    {
                        id: "target-b-ds",
                        code: "AFR_TARGET_B",
                        displayName: "Target B Monthly",
                        periodType: "Monthly",
                        access: writeAccess,
                    },
                ],
            });

        render(instanceA);
        render(instanceB);
        await settle();
        await act(async () => {
            resolveA?.({ objects: monthlyDataSets });
            await Promise.resolve();
        });

        expect(container.textContent).toContain("Target B Monthly");
        expect(container.textContent).not.toContain("Writable monthly");
    });
});
