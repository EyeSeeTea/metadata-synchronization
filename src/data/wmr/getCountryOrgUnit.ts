import _ from "lodash";
import { Future, FutureData } from "../../domain/common/entities/Future";
import { NamedRef } from "../../domain/common/entities/Ref";
import { D2Api } from "../../types/d2-api";
import i18n from "../../utils/i18n";
import { apiToFuture } from "../common/utils/api-futures";

export type CountryOrgUnit = Readonly<NamedRef & { level: number }>;

export function getCountryOrgUnit(api: D2Api): FutureData<CountryOrgUnit> {
    return apiToFuture(
        api.currentUser.get({ fields: { organisationUnits: { id: true, name: true, level: true } } })
    ).flatMap(({ organisationUnits }) => pickCountryOrgUnit(organisationUnits));
}

export function pickCountryOrgUnit(orgUnits: ReadonlyArray<CountryOrgUnit>): FutureData<CountryOrgUnit> {
    const [countryOrgUnit] = _.sortBy(orgUnits, orgUnit => orgUnit.level);
    return countryOrgUnit
        ? Future.success(countryOrgUnit)
        : Future.error(new Error(i18n.t("The user has no capture organisation unit assigned")));
}
