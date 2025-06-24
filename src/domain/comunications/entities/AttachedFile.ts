import { PartialBy } from "../../../types/utils";
import { SharingSetting } from "../../common/entities/SharingSetting";

export type AttachedFile = {
    id: string;
    name: string;
    url: string;
    sharing: ObjectSharing;
};

export interface AttachedFileInput {
    name: string;
    data: Blob;
    sharing: ObjectSharing;
}

export type ObjectSharing = {
    publicAccess?: string;
    externalAccess?: boolean;
    userAccesses?: PartialBy<SharingSetting, "name" | "displayName">[];
    userGroupAccesses?: PartialBy<SharingSetting, "name" | "displayName">[];
};
