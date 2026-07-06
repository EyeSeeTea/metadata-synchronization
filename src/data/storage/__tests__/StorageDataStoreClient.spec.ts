import { D2ApiResponse } from "@eyeseetea/d2-api/api/common";
import { DataStore } from "@eyeseetea/d2-api/api/dataStore";
import { anything, instance, mock, verify, when } from "ts-mockito";
import { Instance } from "../../../domain/instance/entities/Instance";
import { StorageDataStoreClient } from "../StorageDataStoreClient";

describe("StorageDataStoreClient", () => {
    describe("getObject", () => {
        it("returns the value when the dataStore key exists", async () => {
            const expected = { foo: "bar" };
            const { client } = givenAStorageDataStoreClientThatResolvesGetWith(expected);

            const result = await client.getObject("test-key");

            expect(result).toEqual(expected);
        });

        it("returns undefined when the dataStore responds with 404", async () => {
            const notFoundError = { response: { status: 404 }, message: "Not Found" };
            const { client } = givenAStorageDataStoreClientThatRejectsGetWith(notFoundError);

            const result = await client.getObject("missing-key");

            expect(result).toBeUndefined();
        });

        it("throws when the dataStore responds with 500", async () => {
            const serverError = { response: { status: 500 }, message: "Internal Server Error" };
            const { client } = givenAStorageDataStoreClientThatRejectsGetWith(serverError);

            await expect(client.getObject("some-key")).rejects.toEqual(serverError);
        });

        it("throws when a network error occurs", async () => {
            const networkError = new Error("Network Error");
            const { client } = givenAStorageDataStoreClientThatRejectsGetWith(networkError);

            await expect(client.getObject("some-key")).rejects.toThrow("Network Error");
        });

        it("throws when a timeout error occurs", async () => {
            const timeoutError = new Error("timeout of 30000ms exceeded");
            const { client } = givenAStorageDataStoreClientThatRejectsGetWith(timeoutError);

            await expect(client.getObject("some-key")).rejects.toThrow("timeout of 30000ms exceeded");
        });
    });

    describe("saveObjectInCollection", () => {
        it("propagates the error when getObject throws and does NOT overwrite data", async () => {
            const serverError = { response: { status: 500 }, message: "Internal Server Error" };
            const { client, mockedDataStore } = givenAStorageDataStoreClientThatRejectsGetWith(serverError);

            await expect(client.saveObjectInCollection("rules", { id: "rule-1" })).rejects.toEqual(serverError);

            // Verify save was never called -- data was NOT overwritten
            verify(mockedDataStore.save(anything(), anything())).never();
        });
    });
});

function givenAStorageDataStoreClient() {
    const mockedDataStore = mock(DataStore);

    const localInstance = Instance.build({
        url: "http://test.example.com",
        name: "Test Instance",
        version: "2.36",
    });

    const client = new StorageDataStoreClient(localInstance);

    // The DataStore instance is built internally from the D2Api, so it is replaced
    // with the ts-mockito double to keep the rest of the class (and its dependencies) untouched.
    (client as any).dataStore = instance(mockedDataStore);

    return { client, mockedDataStore };
}

function givenAStorageDataStoreClientThatResolvesGetWith<T>(data: T) {
    const { client, mockedDataStore } = givenAStorageDataStoreClient();

    when(mockedDataStore.get(anything())).thenReturn({ getData: () => Promise.resolve(data) } as D2ApiResponse<T>);

    return { client, mockedDataStore };
}

function givenAStorageDataStoreClientThatRejectsGetWith(error: unknown) {
    const { client, mockedDataStore } = givenAStorageDataStoreClient();

    when(mockedDataStore.get(anything())).thenReturn({ getData: () => Promise.reject(error) } as D2ApiResponse<
        unknown
    >);

    return { client, mockedDataStore };
}

export {};
