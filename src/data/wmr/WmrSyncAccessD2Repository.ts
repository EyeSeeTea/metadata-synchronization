import { Future, FutureData } from "../../domain/common/entities/Future";
import { wmrDestinationCode } from "../../domain/entities/wmr/entities/WmrRequisite";
import { WmrSyncAccessInfo } from "../../domain/entities/wmr/entities/WmrSyncAccess";
import { WmrSyncAccessRepository } from "../../domain/entities/wmr/repositories/WmrSyncAccessRepository";
import { Instance } from "../../domain/instance/entities/Instance";
import { D2Api } from "../../types/d2-api";
import { getD2APiFromInstance } from "../../utils/d2-utils";
import i18n from "../../utils/i18n";
import { apiToFuture } from "../common/utils/api-futures";

export class WmrSyncAccessD2Repository implements WmrSyncAccessRepository {
    private api: D2Api;
    constructor(private instance: Instance) {
        this.api = getD2APiFromInstance(this.instance);
    }

    get(): FutureData<WmrSyncAccessInfo> {
        return Future.joinObj({
            dataSets: apiToFuture(
                this.api.models.dataSets.get({
                    fields: { name: true, access: { data: { write: true } } },
                    filter: { code: { eq: wmrDestinationCode } },
                    paging: false,
                })
            ),
            captureOrgUnitIds: apiToFuture(
                this.api.currentUser.get({ fields: { organisationUnits: { id: true } } })
            ).map(({ organisationUnits }) => organisationUnits.map(orgUnit => orgUnit.id)),
        }).flatMap(({ dataSets, captureOrgUnitIds }) => {
            const [dataSet] = dataSets.objects;
            return dataSet
                ? Future.success({
                      dataSet: { name: dataSet.name, canWriteData: dataSet.access.data?.write ?? false },
                      captureOrgUnitIds,
                  })
                : Future.error(
                      new Error(i18n.t("The data set {{code}} is not installed", { code: wmrDestinationCode }))
                  );
        });
    }
}
