import { Server } from "miragejs";
import { Instance } from "../../../domain/instance/entities/Instance";
import { startDhis } from "../../../utils/dhisServer";
import { WmrSettingsD2Repository } from "../WmrSettingsD2Repository";

const baseUrl = "http://origin.test";
const sierraLeone = "ImspTQPwCqd";
const countryFilter = `organisationUnits.path:like:${sierraLeone}`;

const localInstance = Instance.build({ url: baseUrl, name: "Testing", version: "2.40", type: "local" });

const monthlyForm = {
    id: "monthlyForm",
    code: "AFR_COUNTRY_MONTHLY",
    displayName: "MAL - WMR Country Form MONTHLY",
    periodType: "Monthly",
    dataSetElements: [{ dataElement: { id: "malariaDeaths", displayName: "Malaria - deaths" } }],
    indicators: [{ id: "malariaDeathsIndicator", displayName: "MAL - Malaria deaths (female + male)" }],
};

describe("WmrSettingsD2Repository", () => {
    let server: Server;

    beforeEach(() => {
        server = startDhis({ urlPrefix: baseUrl });
        server.get("/me", async () => ({
            organisationUnits: [{ id: sierraLeone, name: "Sierra Leone", level: 1, path: `/${sierraLeone}` }],
        }));
        server.get("/dataSets", async (_schema, request) => ({
            dataSets: new URL(request.url).searchParams.getAll("filter").includes(countryFilter) ? [monthlyForm] : [],
        }));
    });

    afterEach(() => {
        server.shutdown();
    });

    describe("get", () => {
        it("lists the data sets assigned to any org unit under the country, like one assigned only to Ngelehun CHC, with their indicators", async () => {
            const settings = await new WmrSettingsD2Repository(localInstance).get();

            expect(settings.dataSets).toEqual([
                {
                    id: "monthlyForm",
                    name: "MAL - WMR Country Form MONTHLY",
                    periodType: "Monthly",
                    dataElements: [{ id: "malariaDeaths", name: "Malaria - deaths" }],
                    indicators: [{ id: "malariaDeathsIndicator", name: "MAL - Malaria deaths (female + male)" }],
                    orgUnits: [],
                },
            ]);
        });

        it("keeps the country org unit of the current user", async () => {
            const settings = await new WmrSettingsD2Repository(localInstance).get();

            expect(settings.countryOrgUnit).toEqual({ id: sierraLeone, name: "Sierra Leone", path: `/${sierraLeone}` });
        });
    });
});
