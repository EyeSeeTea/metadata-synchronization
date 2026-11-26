import { Server } from "miragejs";
import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { Instance } from "../../../domain/instance/entities/Instance";
import { startDhis } from "../../../utils/dhisServer";
import { WmrRequisitesD2Repository } from "../WmrRequisitesD2Repository";

const baseUrl = "http://origin.test";
const annualId = "annualSync";
const annualOwner = {
    id: annualId,
    code: "MAL_WMR_COUNTRY_SYNC",
    name: "MAL - WMR Form - Country Sync",
    shortName: "Country Sync",
    periodType: "Yearly",
    categoryCombo: { id: "categoryCombo" },
    dataSetElements: [
        {
            dataSet: { id: annualId },
            dataElement: { id: "malariaDeaths" },
            categoryCombo: { id: "categoryCombo" },
        },
    ],
    organisationUnits: [{ id: "country" }],
    dataInputPeriods: [{ period: { id: "2025" } }, { period: { id: "2026" } }],
};
const localInstance = Instance.build({ url: baseUrl, name: "Testing", version: "2.40", type: "local" });

describe("WmrRequisitesD2Repository", () => {
    let server: Server;
    let postedBodies: unknown[];

    beforeEach(() => {
        postedBodies = [];
        server = startDhis({ urlPrefix: baseUrl });
        server.get("/dataSets", () => ({ dataSets: [{ id: annualId }] }));
        server.get("/dataSets/:id", () => annualOwner);
        server.post("/metadata", (_schema, request) => {
            postedBodies.push(JSON.parse(request.requestBody));
            return { status: "OK" };
        });
    });

    afterEach(() => server.shutdown());

    it("creates a monthly staging data set from the installed annual references without changing the annual data set", async () => {
        await new WmrRequisitesD2Repository(localInstance).setupRequisite("regionalMonthlyStaging").toPromise();

        expect(postedBodies).toHaveLength(1);
        const stagedDataSet = (
            postedBodies[0] as {
                dataSets: Array<{
                    id: string;
                    dataSetElements: Array<{
                        dataSet: { id: string };
                        dataElement: { id: string };
                        categoryCombo: { id: string };
                    }>;
                }>;
            }
        ).dataSets[0];
        expect(stagedDataSet.dataSetElements[0]).toEqual({
            dataSet: { id: stagedDataSet.id },
            dataElement: { id: "malariaDeaths" },
            categoryCombo: { id: "categoryCombo" },
        });
        expect(postedBodies[0]).toMatchObject({
            dataSets: [
                {
                    id: expect.any(String),
                    code: "MAL_WMR_REGIONAL_MONTHLY_SYNC",
                    name: "MAL - WMR Regional Monthly Sync",
                    periodType: "Monthly",
                    categoryCombo: { id: "categoryCombo" },
                    dataSetElements: [
                        {
                            dataSet: { id: expect.any(String) },
                            dataElement: { id: "malariaDeaths" },
                            categoryCombo: { id: "categoryCombo" },
                        },
                    ],
                    organisationUnits: [],
                },
            ],
        });
        expect(annualOwner).toEqual({
            id: annualId,
            code: "MAL_WMR_COUNTRY_SYNC",
            name: "MAL - WMR Form - Country Sync",
            shortName: "Country Sync",
            periodType: "Yearly",
            categoryCombo: { id: "categoryCombo" },
            dataSetElements: [
                {
                    dataSet: { id: annualId },
                    dataElement: { id: "malariaDeaths" },
                    categoryCombo: { id: "categoryCombo" },
                },
            ],
            organisationUnits: [{ id: "country" }],
            dataInputPeriods: [{ period: { id: "2025" } }, { period: { id: "2026" } }],
        });
    });

    it("leaves the monthly staging data set without the yearly input periods of the annual data set", async () => {
        await new WmrRequisitesD2Repository(localInstance).setupRequisite("regionalMonthlyStaging").toPromise();

        const [stagedDataSet] = (postedBodies[0] as { dataSets: Array<{ dataInputPeriods: unknown[] }> }).dataSets;
        expect(stagedDataSet?.dataInputPeriods).toEqual([]);
    });
});
