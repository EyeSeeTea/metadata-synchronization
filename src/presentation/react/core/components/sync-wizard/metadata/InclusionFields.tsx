import React from "react";
import Dropdown from "../../dropdown/Dropdown";
import styled from "styled-components";
import i18n from "../../../../../../utils/i18n";
import { InclusionMode } from "../../../../../../domain/user-settings/UserSettings";

const DropdownContainer = styled.div`
    margin-bottom: 16px;
`;

export type InclusionFieldsProps = {
    sharingSettings: {
        value: InclusionMode;
        options: { id: InclusionMode; name: string }[];
        onValueChange: (value: InclusionMode) => void;
        label?: string;
    };
    users: {
        value: InclusionMode;
        options: { id: InclusionMode; name: string }[];
        onValueChange: (value: InclusionMode) => void;
        label?: string;
    };
    orgUnits: {
        value: InclusionMode;
        options: { id: InclusionMode; name: string }[];
        onValueChange: (value: InclusionMode) => void;
        label?: string;
    };
};

export const InclusionFields: React.FC<InclusionFieldsProps> = ({ sharingSettings, users, orgUnits }) => (
    <>
        <DropdownContainer>
            <Dropdown<InclusionMode>
                value={sharingSettings.value}
                items={sharingSettings.options}
                label={sharingSettings.label ?? i18n.t("Include owner and sharing settings")}
                style={{ width: "100%", marginTop: 20, marginBottom: 20, marginLeft: -10 }}
                onValueChange={sharingSettings.onValueChange}
                hideEmpty
            />
        </DropdownContainer>
        <DropdownContainer>
            <Dropdown<InclusionMode>
                value={users.value}
                items={users.options}
                label={users.label ?? i18n.t("Include users")}
                style={{ width: "100%", marginTop: 20, marginBottom: 20, marginLeft: -10 }}
                onValueChange={users.onValueChange}
                hideEmpty
            />
        </DropdownContainer>
        <DropdownContainer>
            <Dropdown<InclusionMode>
                value={orgUnits.value}
                items={orgUnits.options}
                label={orgUnits.label ?? i18n.t("Include organisation units")}
                style={{ width: "100%", marginTop: 20, marginBottom: 20, marginLeft: -10 }}
                onValueChange={orgUnits.onValueChange}
                hideEmpty
            />
        </DropdownContainer>
    </>
);
