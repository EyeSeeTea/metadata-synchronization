import { describe, it, expect } from "vitest";
import { RuleAggregatedDataExchange } from "./RuleAggregatedDataExchange";
import { isValidUid } from "../../common/entities/uid";

const validprops = {
    id: "A12345678901",
    target: {
        instanceId: "B12345678901",
        authType: "http-basic" as const,
        username: "user",
        password: "pass",
    },
};

describe("RuleAggregatedDataExchange", () => {
    it("Should return success with valid props", () => {
        const res = RuleAggregatedDataExchange.create(validprops);

        res.match({
            success: value => {
                expect(value.toProps()).toEqual(validprops);
            },
            error: errors => {
                fail(errors);
            },
        });
    });

    it("Should generate a valid id if empty string provided", () => {
        const res = RuleAggregatedDataExchange.create({
            ...validprops,
            id: "",
        });

        res.match({
            success: value => {
                expect(isValidUid(value.id)).toBe(true);
            },
            error: errors => {
                fail(errors);
            },
        });
    });

    it("Should return success with api-token target", () => {
        const props = {
            ...validprops,
            id: "C12345678901",
            target: {
                instanceId: "D12345678901",
                authType: "api-token" as const,
                token: "secret-token",
            },
        };
        const res = RuleAggregatedDataExchange.create(props);

        res.match({
            success: value => {
                expect(value.toProps()).toEqual(props);
            },
            error: errors => {
                fail(errors);
            },
        });
    });

    it("Should return error when missing instanceId", () => {
        const res = RuleAggregatedDataExchange.create({
            ...validprops,
            id: "E12345678901",
            target: {
                // @ts-expect-error testing validation when instanceId is missing
                instanceId: undefined,
                authType: "api-token",
                token: "t",
            },
        });

        res.match({
            success: _ => fail("expected error for missing instanceId"),
            error: errors => {
                expect(errors.some(e => e.property === "instanceId")).toBe(true);
            },
        });
    });

    it("Should return error when http-basic without username or password", () => {
        const res = RuleAggregatedDataExchange.create({
            ...validprops,
            id: "F12345678901",
            target: {
                instanceId: "G12345678901",
                authType: "http-basic",
                // username missing
                // password missing
            } as any,
        });

        res.match({
            success: _ => fail("expected error for missing username/password"),
            error: errors => {
                expect(errors.some(e => e.property === "username")).toBe(true);
                expect(errors.some(e => e.property === "password")).toBe(true);
            },
        });
    });

    it("Should return error when api-token without token", () => {
        const res = RuleAggregatedDataExchange.create({
            ...validprops,
            id: "H12345678901",
            target: {
                instanceId: "I12345678901",
                authType: "api-token",
            } as any,
        });

        res.match({
            success: _ => fail("expected error for missing token"),
            error: errors => {
                expect(errors.some(e => e.property === "token")).toBe(true);
            },
        });
    });

    it("Should return success in createExisted with http-basic and username only", () => {
        const res = RuleAggregatedDataExchange.createExisted({
            ...validprops,
            id: "J12345678901",
            target: {
                instanceId: "K12345678901",
                authType: "http-basic",
                username: "user",
                // password optional in createExisted
            },
        });

        res.match({
            success: _ => {
                expect(true).toBe(true);
            },
            error: errors => fail(errors),
        });
    });

    it("Should return error in createExisted when http-basic username is missing", () => {
        const res = RuleAggregatedDataExchange.createExisted({
            ...validprops,
            id: "L12345678901",
            target: {
                instanceId: "M12345678901",
                authType: "http-basic",
                // username missing
            } as any,
        });

        res.match({
            success: _ => fail("expected error for missing username in createExisted"),
            error: errors => {
                expect(errors.some(e => e.property === "username")).toBe(true);
            },
        });
    });

    it("Should return error in createExisted when id is empty (no autogeneration)", () => {
        const res = RuleAggregatedDataExchange.createExisted({
            ...validprops,
            id: "",
            target: {
                instanceId: "N12345678901",
                authType: "api-token",
                token: "t",
            },
        });

        res.match({
            success: _ => fail("expected error because id is required in createExisted"),
            error: errors => {
                expect(errors.some(e => e.property === "id")).toBe(true);
            },
        });
    });
});
