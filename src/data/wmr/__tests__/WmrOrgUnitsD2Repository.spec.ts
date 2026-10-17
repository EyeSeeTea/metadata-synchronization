import { Response, Server } from "miragejs";
import { Instance } from "../../../domain/instance/entities/Instance";
import { startDhis } from "../../../utils/dhisServer";
import { WmrOrgUnitsD2Repository } from "../WmrOrgUnitsD2Repository";

const baseUrl = "http://origin.test";
const sierraLeone = "ImspTQPwCqd";
const bo = "O6uvpzGd5pu";
const badjia = "YuQRtpLP10I";
const baoma = "vWbkYPRmKyS";
const ngelehun = "DiszpKrYNg8";
const baomaStation = "jNb63DIHuwU";
const monthlyFormId = "monthlyForm";
const countrySyncId = "countrySync";
const monthlyFormName = "MAL - WMR Country Form MONTHLY";
const countrySyncName = "MAL - WMR Form - Country Sync";
const dataSetElements = [{ dataElement: { id: "malariaDeaths" } }];
const assignErrorPrefix = "The organisation units could not be assigned";
const permissionSuffix = `Your user needs permission to edit the data sets ${monthlyFormName}, ${countrySyncName}.`;

const localInstance = Instance.build({ url: baseUrl, name: "Testing", version: "2.40", type: "local" });

const facilities = [
    { id: ngelehun, displayName: "Ngelehun CHC", level: 4, path: `/${sierraLeone}/${bo}/${badjia}/${ngelehun}` },
    {
        id: baomaStation,
        displayName: "Baoma Station CHP",
        level: 4,
        path: `/${sierraLeone}/${bo}/${baoma}/${baomaStation}`,
    },
];

const ownerDataSets: Readonly<Record<string, object>> = {
    [monthlyFormId]: {
        id: monthlyFormId,
        code: "AFR_COUNTRY_MONTHLY",
        periodType: "Monthly",
        dataSetElements,
        organisationUnits: [{ id: "oldFacility" }],
    },
    [countrySyncId]: {
        id: countrySyncId,
        code: "MAL_WMR_COUNTRY_SYNC",
        periodType: "Yearly",
        dataSetElements,
        organisationUnits: [{ id: sierraLeone }, { id: "oldParent" }],
    },
};

function filtersOf(url: string): string[] {
    return new URL(url).searchParams.getAll("filter");
}

describe("WmrOrgUnitsD2Repository", () => {
    let server: Server;
    let postedBodies: unknown[];
    let orgUnitFilters: unknown[];

    function repository() {
        return new WmrOrgUnitsD2Repository(localInstance);
    }

    function respondToImport(response: () => Response | object) {
        server.post("/metadata", async (_schema, request) => {
            postedBodies.push(JSON.parse(request.requestBody));
            return response();
        });
    }

    beforeEach(() => {
        postedBodies = [];
        orgUnitFilters = [];
        server = startDhis({ urlPrefix: baseUrl });
        server.get("/me", async () => ({ organisationUnits: [{ id: sierraLeone, name: "Sierra Leone", level: 1 }] }));
        server.get("/dataSets", async () => ({
            dataSets: [
                { id: monthlyFormId, code: "AFR_COUNTRY_MONTHLY", displayName: monthlyFormName },
                { id: countrySyncId, code: "MAL_WMR_COUNTRY_SYNC", displayName: countrySyncName },
            ],
        }));
        server.get("/dataSets/:id", async (_schema, request) => ownerDataSets[request.params["id"] ?? ""] ?? {});
        server.get("/organisationUnits", async (_schema, request) => {
            orgUnitFilters.push(filtersOf(request.url));
            return { organisationUnits: facilities };
        });
    });

    afterEach(() => {
        server.shutdown();
    });

    describe("assignLevel", () => {
        it("posts both complete data sets replacing only their organisation units", async () => {
            respondToImport(() => ({ status: "OK" }));

            await repository().assignLevel(4).toPromise();

            expect(orgUnitFilters).toEqual([["level:eq:4", `path:like:${sierraLeone}`]]);
            expect(postedBodies).toEqual([
                {
                    dataSets: [
                        {
                            ...ownerDataSets[monthlyFormId],
                            organisationUnits: [{ id: ngelehun }, { id: baomaStation }],
                        },
                        {
                            ...ownerDataSets[countrySyncId],
                            organisationUnits: [{ id: sierraLeone }, { id: badjia }, { id: baoma }],
                        },
                    ],
                },
            ]);
        });

        it("fails with the reason of the error reports when the import is not OK", async () => {
            respondToImport(() => ({
                status: "ERROR",
                typeReports: [{ objectReports: [{ errorReports: [{ message: "Invalid reference" }] }] }],
            }));

            await expect(repository().assignLevel(4).toPromise()).rejects.toEqual(
                new Error(`${assignErrorPrefix}: Invalid reference. ${permissionSuffix}`)
            );
        });

        it("fails with the HTTP message when the user cannot edit the data sets", async () => {
            respondToImport(() => new Response(403, {}, { httpStatus: "Forbidden", message: "Access denied" }));

            await expect(repository().assignLevel(4).toPromise()).rejects.toEqual(
                new Error(`${assignErrorPrefix}: Access denied. ${permissionSuffix}`)
            );
        });
    });

    describe("getLevels", () => {
        it("counts the org units of each level under the country", async () => {
            server.get("/organisationUnitLevels", async () => ({
                organisationUnitLevels: [
                    { level: 3, displayName: "Chiefdom" },
                    { level: 4, displayName: "Facility" },
                ],
            }));
            server.get("/organisationUnits", async (_schema, request) => ({
                organisationUnits: [],
                pager: {
                    page: 1,
                    pageSize: 1,
                    pageCount: 1,
                    total: filtersOf(request.url).includes("level:eq:3") ? 152 : 1166,
                },
            }));

            expect(await repository().getLevels().toPromise()).toEqual([
                { level: 3, name: "Chiefdom", count: 152 },
                { level: 4, name: "Facility", count: 1166 },
            ]);
        });
    });

    describe("getAssigned", () => {
        it("returns the org units of the data set with their level and path", async () => {
            server.get("/dataSets", async () => ({ dataSets: [{ organisationUnits: facilities }] }));

            expect(await repository().getAssigned("AFR_COUNTRY_MONTHLY").toPromise()).toEqual([
                { id: ngelehun, name: "Ngelehun CHC", level: 4, path: facilities[0]?.path },
                { id: baomaStation, name: "Baoma Station CHP", level: 4, path: facilities[1]?.path },
            ]);
        });
    });
});
