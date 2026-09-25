import { Server } from "miragejs";
import { Instance } from "../../../domain/instance/entities/Instance";
import { getD2APiFromInstance } from "../../../utils/d2-utils";
import { startDhis } from "../../../utils/dhisServer";
import { CountryOrgUnit, getCountryOrgUnit, pickCountryOrgUnit } from "../getCountryOrgUnit";

const baseUrl = "http://origin.test";
const noCaptureOrgUnitError = new Error("The user has no capture organisation unit assigned");

const sierraLeone: CountryOrgUnit = { id: "ImspTQPwCqd", name: "Sierra Leone", level: 1 };
const bo: CountryOrgUnit = { id: "O6uvpzGd5pu", name: "Bo", level: 2 };
const bombali: CountryOrgUnit = { id: "fdc6uOvgoji", name: "Bombali", level: 2 };
const badjia: CountryOrgUnit = { id: "YuQRtpLP10I", name: "Badjia", level: 3 };

describe("pickCountryOrgUnit", () => {
    it("returns the only capture org unit", async () => {
        expect(await pickCountryOrgUnit([bo]).toPromise()).toEqual(bo);
    });

    it("returns the org unit with the lowest level", async () => {
        expect(await pickCountryOrgUnit([badjia, bo, sierraLeone]).toPromise()).toEqual(sierraLeone);
    });

    it("keeps the API order when several org units share the lowest level", async () => {
        expect(await pickCountryOrgUnit([badjia, bombali, bo]).toPromise()).toEqual(bombali);
    });

    it("fails when the user has no capture org unit", async () => {
        await expect(pickCountryOrgUnit([]).toPromise()).rejects.toEqual(noCaptureOrgUnitError);
    });
});

describe("getCountryOrgUnit", () => {
    let server: Server;
    let requestedFields: unknown[];

    beforeEach(() => {
        requestedFields = [];
        server = startDhis({ urlPrefix: baseUrl });
        server.get("/me", async (_schema, request) => {
            requestedFields.push(request.queryParams["fields"]);
            return { organisationUnits: [badjia, bo] };
        });
    });

    afterEach(() => {
        server.shutdown();
    });

    it("picks the country from the capture org units of the current user", async () => {
        const instance = Instance.build({ url: baseUrl, name: "Testing", version: "2.40", type: "local" });

        const countryOrgUnit = await getCountryOrgUnit(getD2APiFromInstance(instance)).toPromise();

        expect({ countryOrgUnit, requestedFields }).toEqual({
            countryOrgUnit: bo,
            requestedFields: ["organisationUnits[id,level,name]"],
        });
    });
});
