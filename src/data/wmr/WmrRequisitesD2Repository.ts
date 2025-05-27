import { Future, FutureData } from "../../domain/common/entities/Future";
import { WmrRequisiteType } from "../../domain/entities/wmr/entities/WmrRequisite";
import { WmrRequisitesRepository } from "../../domain/entities/wmr/repositories/WmrRequisitesRepository";
import { Instance } from "../../domain/instance/entities/Instance";
import { D2Api } from "../../types/d2-api";
import { getD2APiFromInstance } from "../../utils/d2-utils";
import { apiToFuture } from "../common/utils/api-futures";
import { StorageDataStoreClient } from "../storage/StorageDataStoreClient";

export class WmrRequisitesD2Repository implements WmrRequisitesRepository {
    private api: D2Api;
    constructor(private instance: Instance) {
        this.api = getD2APiFromInstance(this.instance);
    }

    checkWmrRequisites(requisiteType: WmrRequisiteType): FutureData<boolean> {
        switch (requisiteType) {
            case "metadata":
                return this.countryDatasetExists();
            case "dataStore":
                return this.dataStoreSettingsExist();
            default:
                return Future.error(new Error(`Unknown requisiteType ${requisiteType}`));
        }
    }

    countryDatasetExists(): FutureData<boolean> {
        // TODO: make this code dynamic based on the file to import?
        // TODO: check consistency with the file to import, and also check other metadata such as constants, options, etc.?
        const CODE = "MAL_WMR_COUNTRY_SYNC";
        return apiToFuture(
            this.api.models.dataSets.get({
                filter: { code: { eq: CODE } },
                fields: { id: true },
            })
        ).map(response => response.objects.length !== 0);
    }

    dataStoreSettingsExist(): FutureData<boolean> {
        const AUTOGENFORMS_NAMESPACE = "d2-autogen-forms";
        const MAL_WMR_KEY = "MAL-WMR";
        // TODO: check consistency with the file to import?
        const dataStoreClient = new StorageDataStoreClient(this.instance, AUTOGENFORMS_NAMESPACE);
        return dataStoreClient.getObjectFuture(MAL_WMR_KEY).map(malWmrSettings => !!malWmrSettings);
    }
}
