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
const countrySync = {
    id: "countrySync",
    code: "MAL_WMR_COUNTRY_SYNC",
    displayName: "MAL - WMR Form - Country Sync",
    periodType: "Yearly",
    dataSetElements: [{ dataElement: { id: "malariaDeaths", displayName: "Malaria - deaths" } }],
    indicators: [],
};
const regionalMonthlyStaging = {
    id: "regionalMonthlyStaging",
    code: "MAL_WMR_REGIONAL_MONTHLY_SYNC",
    displayName: "MAL - WMR Regional Monthly Sync",
    periodType: "Monthly",
    dataSetElements: [{ dataElement: { id: "malariaDeaths", displayName: "Malaria - deaths" } }],
    indicators: [],
};

describe("WmrSettingsD2Repository", () => {
    let server: Server;

    beforeEach(() => {
        server = startDhis({ urlPrefix: baseUrl });
        server.get("/me", async () => ({
            organisationUnits: [{ id: sierraLeone, name: "Sierra Leone", level: 1, path: `/${sierraLeone}` }],
        }));
        server.get("/dataSets", async (_schema, request) => {
            const filters = new URL(request.url).searchParams.getAll("filter");
            return {
                dataSets: filters.includes(countryFilter)
                    ? [monthlyForm]
                    : filters.some(filter => filter.startsWith("code:in:"))
                    ? [countrySync, regionalMonthlyStaging]
                    : [],
            };
        });
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

        it("resolves the staging destination independently for each flow", async () => {
            const settings = await new WmrSettingsD2Repository(localInstance).get();

            expect(settings.destinations).toEqual({
                global: {
                    id: countrySync.id,
                    code: countrySync.code,
                    name: countrySync.displayName,
                    periodType: "Yearly",
                    dataElementsIds: ["malariaDeaths"],
                },
                regional: {
                    id: regionalMonthlyStaging.id,
                    code: regionalMonthlyStaging.code,
                    name: regionalMonthlyStaging.displayName,
                    periodType: "Monthly",
                    dataElementsIds: ["malariaDeaths"],
                },
            });
        });
    });
});
