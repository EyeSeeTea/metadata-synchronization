import _ from "lodash";
import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { Instance } from "../../../../domain/instance/entities/Instance";
import {
    MetadataMapping,
    MetadataMappingDictionary,
} from "../../../../domain/instance/entities/MetadataMapping";
import i18n from "../../../../locales";
import {
    AggregatedDataElementModel,
    EventProgramWithDataElementsModel,
    EventProgramWithIndicatorsModel,
    GlobalCategoryComboModel,
    GlobalCategoryModel,
    GlobalCategoryOptionGroupModel,
    GlobalCategoryOptionGroupSetModel,
    GlobalCategoryOptionModel,
    GlobalDataElementModel,
    GlobalOptionModel,
    IndicatorMappedModel,
    OrganisationUnitMappedModel,
} from "../../../../models/dhis/mapping";
import { useAppContext } from "../../../common/contexts/AppContext";
import MappingTable from "../../components/mapping-table/MappingTable";
import PageHeader from "../../components/page-header/PageHeader";

export type MappingType = "aggregated" | "tracker" | "orgUnit";

const config = {
    aggregated: {
        title: i18n.t("Aggregated mapping"),
        models: [AggregatedDataElementModel, IndicatorMappedModel],
    },
    tracker: {
        title: i18n.t("Program (events) mapping"),
        models: [EventProgramWithDataElementsModel, EventProgramWithIndicatorsModel],
    },
    orgUnit: {
        title: i18n.t("Organisation unit mapping"),
        models: [OrganisationUnitMappedModel],
    },
    global: {
        title: i18n.t("Global mapping"),
        models: [
            GlobalCategoryModel,
            GlobalCategoryComboModel,
            GlobalCategoryOptionModel,
            GlobalCategoryOptionGroupModel,
            GlobalCategoryOptionGroupSetModel,
            GlobalDataElementModel,
            GlobalOptionModel,
        ],
    },
};

interface InstanceMappingParams {
    id: string;
    section: MappingType;
}

export default function InstanceMappingPage() {
    const { compositionRoot } = useAppContext();
    const history = useHistory();

    const { id, section } = useParams() as InstanceMappingParams;
    const { models, title: sectionTitle } = config[section];

    const [instance, setInstance] = useState<Instance>();

    useEffect(() => {
        compositionRoot.instances.getById(id).then(result =>
            result.match({
                success: setInstance,
                error: () => {},
            })
        );
    }, [compositionRoot, id]);

    const backHome = () => {
        history.push(`/instances/mapping/${id}`);
    };

    const onChangeMapping = async (metadataMapping: MetadataMappingDictionary) => {
        if (!instance) return;

        const newInstance = instance.update({ metadataMapping });
        await compositionRoot.instances.save(newInstance);
        setInstance(newInstance);
    };

    const onApplyGlobalMapping = async (type: string, id: string, subMapping: MetadataMapping) => {
        if (!instance) return;

        const newMapping = _.clone(instance.metadataMapping);
        _.set(newMapping, [type, id], { ...subMapping, global: true });
        await onChangeMapping(newMapping);
    };

    const instanceTitle = instance ? i18n.t("Between this instance and {{name}}", instance) : null;
    const title = _.compact([sectionTitle, instanceTitle]).join(" - ");

    return (
        <React.Fragment>
            <PageHeader title={title} onBackClick={backHome} />

            {!!instance && (
                <MappingTable
                    models={models}
                    instance={instance}
                    mapping={instance.metadataMapping}
                    globalMapping={instance.metadataMapping}
                    onChangeMapping={onChangeMapping}
                    onApplyGlobalMapping={onApplyGlobalMapping}
                />
            )}
        </React.Fragment>
    );
}
