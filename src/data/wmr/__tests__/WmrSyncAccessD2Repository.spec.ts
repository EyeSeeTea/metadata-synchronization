import { Server } from "miragejs";
import { Instance } from "../../../domain/instance/entities/Instance";
import { startDhis } from "../../../utils/dhisServer";
import { WmrSyncAccessD2Repository } from "../WmrSyncAccessD2Repository";

const baseUrl = "http://origin.test";
const sierraLeone = "ImspTQPwCqd";
const countrySyncName = "MAL - WMR Form - Country Sync";

const localInstance = Instance.build({ url: baseUrl, name: "Testing", version: "2.40", type: "local" });

describe("WmrSyncAccessD2Repository", () => {
    let server: Server;
    let requestedDataSetParams: unknown[];

    function givenCountrySync(dataSets: object[]) {
        server.get("/dataSets", async (_schema, request) => {
            const { searchParams } = new URL(request.url);
            requestedDataSetParams.push({ filter: searchParams.getAll("filter"), fields: searchParams.get("fields") });
            return { dataSets };
        });
    }

    beforeEach(() => {
        requestedDataSetParams = [];
        server = startDhis({ urlPrefix: baseUrl });
        server.get("/me", async () => ({ organisationUnits: [{ id: sierraLeone }] }));
    });

    afterEach(() => {
        server.shutdown();
    });

    describe("get", () => {
        it("reads the data write access of the Country Sync by code and the capture org units", async () => {
            givenCountrySync([{ name: countrySyncName, access: { data: { write: true } } }]);

            const info = await new WmrSyncAccessD2Repository(localInstance).get("global").toPromise();

            expect({ info, requestedDataSetParams }).toEqual({
                info: { dataSet: { name: countrySyncName, canWriteData: true }, captureOrgUnitIds: [sierraLeone] },
                requestedDataSetParams: [
                    { filter: ["code:eq:MAL_WMR_COUNTRY_SYNC"], fields: "access[data[write]],name" },
                ],
            });
        });

        it("reads a missing data access as no data write", async () => {
            givenCountrySync([{ name: countrySyncName, access: {} }]);

            const info = await new WmrSyncAccessD2Repository(localInstance).get("global").toPromise();

            expect(info.dataSet).toEqual({ name: countrySyncName, canWriteData: false });
        });

        it("fails when the Country Sync is not installed", async () => {
            givenCountrySync([]);

            await expect(new WmrSyncAccessD2Repository(localInstance).get("global").toPromise()).rejects.toEqual(
                new Error("The data set MAL_WMR_COUNTRY_SYNC is not installed")
            );
        });

        it("checks data write access against the monthly staging data set for regional flow", async () => {
            givenCountrySync([{ name: "MAL - WMR Regional Monthly Sync", access: { data: { write: true } } }]);

            await new WmrSyncAccessD2Repository(localInstance).get("regional").toPromise();

            expect(requestedDataSetParams).toEqual([
                { filter: ["code:eq:MAL_WMR_REGIONAL_MONTHLY_SYNC"], fields: "access[data[write]],name" },
            ]);
        });
    });
});
