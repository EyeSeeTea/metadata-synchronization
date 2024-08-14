import _ from "lodash";
import { NamedRef } from "../../../common/entities/Ref";
import { Id } from "../../../common/entities/Schemas";

export type WmrDataSetAttrs = NamedRef & { dataElements: NamedRef[]; orgUnits: NamedRef[] };

export class WmrDataSet {
    public readonly id: Id;
    public readonly name: string;
    public readonly dataElements: NamedRef[];
    public readonly orgUnits: NamedRef[];
    constructor(data: WmrDataSetAttrs) {
        this.id = data.id;
        this.name = data.name;
        this.dataElements = data.dataElements;
        this.orgUnits = data.orgUnits;
    }

    static getOrgUnitsIds(dataSet: WmrDataSet): Id[] {
        return dataSet.orgUnits.map(ou => ou.id);
    }

    static getDifferenceOrgsUnits(dataSet: WmrDataSet, otherDataSet: WmrDataSet): NamedRef[] {
        const difference = _(dataSet.orgUnits).differenceBy(otherDataSet.orgUnits, "id").value();
        return difference;
    }
}
