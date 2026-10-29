import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { MemoryRouter, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WmrLogsButton } from "../WmrLogsButton";

vi.mock("../../../../../utils/i18n", () => ({ default: { t: (message: string) => message } }));

const logsLabel = "Logs";
const container = document.createElement("div");

describe("WmrLogsButton", () => {
    let pathname: string;

    beforeEach(() => {
        document.body.appendChild(container);
        act(() => {
            ReactDOM.render(
                <MemoryRouter initialEntries={["/wmr"]}>
                    <WmrLogsButton />
                    <Route
                        render={({ location }) => {
                            pathname = location.pathname;
                            return null;
                        }}
                    />
                </MemoryRouter>,
                container
            );
        });
    });

    afterEach(() => {
        act(() => {
            ReactDOM.unmountComponentAtNode(container);
        });
        container.remove();
    });

    it("is an icon button named Logs", () => {
        expect(getButton().getAttribute("aria-label")).toBe(logsLabel);
    });

    it("opens the aggregated history", () => {
        act(() => {
            getButton().click();
        });

        expect(pathname).toBe("/history/aggregated");
    });
});

function getButton(): HTMLButtonElement {
    const button = container.querySelector<HTMLButtonElement>(`button[aria-label="${logsLabel}"]`);
    if (!button) throw new Error(`No button named ${logsLabel}`);
    return button;
}
