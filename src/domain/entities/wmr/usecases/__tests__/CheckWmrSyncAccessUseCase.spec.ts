import { describe, expect, it } from "vitest";
import { Future } from "../../../../common/entities/Future";
import { DynamicRepositoryFactory } from "../../../../common/factories/DynamicRepositoryFactory";
import { Instance } from "../../../../instance/entities/Instance";
import { WmrSyncAccessInfo } from "../../entities/WmrSyncAccess";
import { CheckWmrSyncAccessUseCase } from "../CheckWmrSyncAccessUseCase";

const localInstance = Instance.build({ id: "LOCAL", name: "Local instance", type: "local", url: "http://localhost" });
const sierraLeone = { id: "ImspTQPwCqd", name: "Sierra Leone", path: "/ImspTQPwCqd" };
const countrySyncName = "MAL - WMR Form - Country Sync";

function givenUseCase(info: WmrSyncAccessInfo) {
    const repositoryFactory = {
        wmrSyncAccessRepository: () => ({ get: () => Future.success(info) }),
    } as unknown as DynamicRepositoryFactory;
    return new CheckWmrSyncAccessUseCase(repositoryFactory, localInstance);
}

describe("CheckWmrSyncAccessUseCase", () => {
    it("allows the sync with the access read from the repository", async () => {
        const useCase = givenUseCase({
            dataSet: { name: countrySyncName, canWriteData: true },
            captureOrgUnitIds: [sierraLeone.id],
        });

        await expect(useCase.execute("global", [sierraLeone]).toPromise()).resolves.toEqual({ type: "ok" });
    });

    it("rejects the destination org units outside the capture org units read from the repository", async () => {
        const useCase = givenUseCase({
            dataSet: { name: countrySyncName, canWriteData: true },
            captureOrgUnitIds: ["O6uvpzGd5pu"],
        });

        await expect(useCase.execute("regional", [sierraLeone]).toPromise()).resolves.toEqual({
            type: "outsideCapture",
            orgUnitNames: ["Sierra Leone"],
        });
    });
});
