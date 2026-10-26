import { Box, LinearProgress, Typography } from "@material-ui/core";
import React from "react";
import { isOrgUnitMapped } from "../../../../domain/entities/wmr/entities/WmrOrgUnits";
import { Instance } from "../../../../domain/instance/entities/Instance";
import { MetadataMappingDictionary } from "../../../../domain/mapping/entities/MetadataMapping";
import i18n from "../../../../utils/i18n";
import { useAppContext } from "../../../react/core/contexts/AppContext";
import InstanceMappingPage from "../../core/pages/instance-mapping/InstanceMappingPage";
import { useWmrContext } from "../context/WmrContext";

export type WmrOrgUnitMappingProps = Readonly<{ instance: Instance }>;

export function WmrOrgUnitMapping({ instance }: WmrOrgUnitMappingProps) {
    const { compositionRoot } = useAppContext();
    const { regionalOutputOrgUnits, orgUnitMapping, setOrgUnitMapping } = useWmrContext();
    const outputOrgUnitIds = React.useMemo(
        () => regionalOutputOrgUnits.map(({ id }) => id),
        [regionalOutputOrgUnits]
    );

    React.useEffect(() => {
        compositionRoot.mapping
            .get({ type: "instance", id: instance.id })
            .then(mapping => setOrgUnitMapping(mapping?.mappingDictionary.organisationUnits ?? {}))
            .catch(error => console.error(error));
    }, [compositionRoot.mapping, instance.id, setOrgUnitMapping]);

    const onChangeMapping = React.useCallback(
        (mapping: MetadataMappingDictionary) => setOrgUnitMapping(mapping.organisationUnits ?? {}),
        [setOrgUnitMapping]
    );

    const total = outputOrgUnitIds.length;
    const mapped = outputOrgUnitIds.filter(id => isOrgUnitMapped(orgUnitMapping, id)).length;
    const counter = i18n.t("{{mapped}} of {{total}} mapped", { mapped, total });

    return (
        <Box>
            <Typography variant="body2" color="textSecondary">
                {counter}
            </Typography>
            <Box py={3}>
                <LinearProgress
                    variant="determinate"
                    value={total > 0 ? (mapped * 100) / total : 0}
                    aria-label={counter}
                />
            </Box>
            <InstanceMappingPage
                instanceId={instance.id}
                section="orgUnit"
                showHeader={false}
                filterRows={outputOrgUnitIds}
                onChange={onChangeMapping}
            />
        </Box>
    );
}
