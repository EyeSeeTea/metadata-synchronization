import { CancelableResponse } from "@eyeseetea/d2-api";
import { Instance } from "../../../domain/instance/entities/Instance";
import { StorageDataStoreClient } from "../StorageDataStoreClient";

function buildClient() {
    const instance = Instance.build({
        url: "http://test.example.com",
        name: "Test Instance",
        version: "2.36",
    });

    const client = new StorageDataStoreClient(instance);

    // Replace the private dataStore with a mock to avoid real HTTP calls
    const mockDataStore = {
        get: vi.fn(),
        getMetadata: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
        getKeys: vi.fn(),
    };

    (client as any).dataStore = mockDataStore;

    return { client, mockDataStore };
}

function buildCancelableResponse<T>(promise: () => Promise<T>): CancelableResponse<T> {
    return CancelableResponse.build({
        cancel: () => {},
        response: () => promise().then(data => ({ status: 200, data, headers: {} })),
    });
}

function buildCancelableRejection<T>(error: unknown): CancelableResponse<T> {
    return CancelableResponse.build({
        cancel: () => {},
        response: () => Promise.reject(error),
    });
}

describe("StorageDataStoreClient", () => {
    describe("getObject", () => {
        it("returns the value when the dataStore key exists", async () => {
            const { client, mockDataStore } = buildClient();
            const expected = { foo: "bar" };

            mockDataStore.get.mockReturnValue(buildCancelableResponse(() => Promise.resolve(expected)));

            const result = await client.getObject("test-key");

            expect(result).toEqual(expected);
            expect(mockDataStore.get).toHaveBeenCalledWith("test-key");
        });

        it("returns undefined when the dataStore responds with 404", async () => {
            const { client, mockDataStore } = buildClient();

            const notFoundError = { response: { status: 404 }, message: "Not Found" };
            mockDataStore.get.mockReturnValue(buildCancelableRejection(notFoundError));

            const result = await client.getObject("missing-key");

            expect(result).toBeUndefined();
        });

        it("throws when the dataStore responds with 500", async () => {
            const { client, mockDataStore } = buildClient();

            const serverError = { response: { status: 500 }, message: "Internal Server Error" };
            mockDataStore.get.mockReturnValue(buildCancelableRejection(serverError));

            await expect(client.getObject("some-key")).rejects.toEqual(serverError);
        });

        it("throws when a network error occurs", async () => {
            const { client, mockDataStore } = buildClient();

            const networkError = new Error("Network Error");
            mockDataStore.get.mockReturnValue(buildCancelableRejection(networkError));

            await expect(client.getObject("some-key")).rejects.toThrow("Network Error");
        });

        it("throws when a timeout error occurs", async () => {
            const { client, mockDataStore } = buildClient();

            const timeoutError = new Error("timeout of 30000ms exceeded");
            mockDataStore.get.mockReturnValue(buildCancelableRejection(timeoutError));

            await expect(client.getObject("some-key")).rejects.toThrow("timeout of 30000ms exceeded");
        });
    });

    describe("saveObjectInCollection", () => {
        it("propagates the error when getObject throws and does NOT overwrite data", async () => {
            const { client, mockDataStore } = buildClient();

            const serverError = { response: { status: 500 }, message: "Internal Server Error" };
            mockDataStore.get.mockReturnValue(buildCancelableRejection(serverError));

            await expect(client.saveObjectInCollection("rules", { id: "rule-1" })).rejects.toEqual(serverError);

            // Verify save was never called -- data was NOT overwritten
            expect(mockDataStore.save).not.toHaveBeenCalled();
        });
    });
});

export {};
