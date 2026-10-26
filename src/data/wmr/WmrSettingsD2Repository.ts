import { D2Api, D2DataSetSchema, SelectedPick } from "../../types/d2-api";
import {
    DataSetAttrs,
    parseDataSetPeriodType,
    WmrDestination,
    WmrSettings,
} from "../../domain/entities/wmr/entities/WmrSettings";
import { wmrDestinationCodes } from "../../domain/entities/wmr/entities/WmrRequisite";
import { WmrSettingsRepository } from "../../domain/entities/wmr/repositories/WmrSettingsRepository";
import { Instance } from "../../domain/instance/entities/Instance";
import { getD2APiFromInstance } from "../../utils/d2-utils";
import { getCountryOrgUnit } from "./getCountryOrgUnit";

const dataSetFields = {
    id: true,
    code: true,
    displayName: true,
    periodType: true,
    dataSetElements: { dataElement: { id: true, displayName: true } },
    indicators: { id: true, displayName: true },
};

type D2DataSet = SelectedPick<D2DataSetSchema, typeof dataSetFields>;

export class WmrSettingsD2Repository implements WmrSettingsRepository {
    private api: D2Api;
    constructor(private instance: Instance) {
        this.api = getD2APiFromInstance(this.instance);
    }

    async get(): Promise<WmrSettings> {
        const countryOrgUnit = await getCountryOrgUnit(this.api).toPromise();
        const dataSetsResponse = await this.api.models.dataSets
            .get({
                fields: dataSetFields,
                filter: { "organisationUnits.path": { like: countryOrgUnit.id } },
                paging: false,
                order: "displayName:asc",
            })
            .getData();
        const destinationsResponse = await this.api.models.dataSets
            .get({ fields: dataSetFields, filter: { code: { in: Object.values(wmrDestinationCodes) } }, paging: false })
            .getData();

        return new WmrSettings({
            dataSets: dataSetsResponse.objects.flatMap(toDataSetAttrs),
            destinations: {
                global: destinationsResponse.objects
                    .filter(({ code }) => code === wmrDestinationCodes.global)
                    .flatMap(toDestination)[0],
                regional: destinationsResponse.objects
                    .filter(({ code }) => code === wmrDestinationCodes.regional)
                    .flatMap(toDestination)[0],
            },
            countryOrgUnit: { id: countryOrgUnit.id, name: countryOrgUnit.name, path: countryOrgUnit.path },
        });
    }
}

function toDataSetAttrs(dataSet: D2DataSet): DataSetAttrs[] {
    const periodType = parseDataSetPeriodType(dataSet.periodType);
    if (!periodType) return [];

    return [
        {
            id: dataSet.id,
            name: dataSet.displayName,
            periodType,
            dataElements: dataSet.dataSetElements.map(({ dataElement }) => ({
                id: dataElement.id,
                name: dataElement.displayName,
            })),
            indicators: dataSet.indicators.map(indicator => ({ id: indicator.id, name: indicator.displayName })),
            orgUnits: [],
        },
    ];
}

function toDestination(dataSet: D2DataSet): WmrDestination[] {
    return toDataSetAttrs(dataSet).map(({ id, name, periodType, dataElements }) => ({
        id,
        code: dataSet.code,
        name,
        periodType,
        dataElementsIds: dataElements.map(dataElement => dataElement.id),
    }));
}
