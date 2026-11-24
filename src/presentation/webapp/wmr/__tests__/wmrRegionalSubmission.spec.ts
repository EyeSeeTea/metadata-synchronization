import { describe, expect, it, vi } from "vitest";
import { getWmrRegionalSubmissionWarning, isWmrRegionalSubmissionAvailable } from "../wmrRegionalSubmission";

vi.mock("../../../../../utils/i18n", () => ({ default: { t: (message: string) => message } }));

describe("WMR regional submission policy", () => {
    it("keeps global submission available and blocks regional submission", () => {
        expect([isWmrRegionalSubmissionAvailable("global"), isWmrRegionalSubmissionAvailable("regional")]).toEqual([
            true,
            false,
        ]);
    });

    it("explains why regional submission is unavailable", () => {
        expect(getWmrRegionalSubmissionWarning()).toBe(
            "Regional submission is temporarily unavailable while monthly district reporting is being corrected."
        );
    });
});
