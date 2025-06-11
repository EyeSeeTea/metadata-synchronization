import { D2Api } from "../../types/d2-api";
import { WmrSettings } from "../../domain/entities/wmr/entities/WmrSettings";
import { WmrSettingsRepository } from "../../domain/entities/wmr/repositories/WmrSettingsRepository";
import { Instance } from "../../domain/instance/entities/Instance";
import { getD2APiFromInstance } from "../../utils/d2-utils";
import { Id } from "../../domain/common/entities/Schemas";

export const dataSetFields = {
    id: true,
    displayName: true,
    dataSetElements: { dataElement: { id: true, displayName: true } },
};

export class WmrSettingsD2Repository implements WmrSettingsRepository {
    private api: D2Api;
    constructor(private instance: Instance) {
        this.api = getD2APiFromInstance(this.instance);
    }

    async get(): Promise<WmrSettings> {
        const dataSetsResponse = await this.api.models.dataSets
            .get({
                fields: dataSetFields,
                // very unlikely to have hundreds of dataSets in an instance
                // if it happens, we can get all dataSets page by page
                paging: false,
                order: "displayName:asc",
            })
            .getData();

        const countryDataSet = await this.getCountrySyncDataElements("MAL_WMR_COUNTRY_SYNC");

        return new WmrSettings({
            countryDataSetId: countryDataSet.dataSetId,
            countryDataElementsIds: countryDataSet.dataElementsIds,
            dataSets: dataSetsResponse.objects.map(({ id, displayName, dataSetElements }) => ({
                id,
                name: displayName,
                dataElements: dataSetElements.map(({ dataElement }) => ({
                    id: dataElement.id,
                    name: dataElement.displayName,
                })),
                orgUnits: [],
            })),
        });
    }

    private async getCountrySyncDataElements(code: string): Promise<{ dataSetId: Id; dataElementsIds: Id[] }> {
        const response = await this.api.models.dataSets
            .get({ fields: dataSetFields, filter: { code: { eq: code } } })
            .getData();

        const firstDataSet = response.objects[0];
        if (!firstDataSet) throw new Error(`Country sync dataSet not found: ${code}`);

        return {
            dataSetId: firstDataSet.id,
            dataElementsIds: firstDataSet.dataSetElements.map(({ dataElement }) => dataElement.id),
        };
    }
}
