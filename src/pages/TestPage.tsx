import React, { useState } from "react";

import { TableAction } from "../components/data-table/types";
import ObjectsTable from "../components/data-table/ObjectsTable";
//@ts-ignore
import { Typography, Checkbox } from "@material-ui/core";

function createData(
    name: string,
    calories: number,
    fat: number,
    carbs: number,
    protein: number
): any {
    return { id: name, name, calories, fat, carbs, protein };
}

const rows = [
    createData("Cupcake", 305, 3.7, 67, 4.3),
    createData("Donut", 452, 25.0, 51, 4.9),
    createData("Eclair", 262, 16.0, 24, 6.0),
    createData("Frozen yoghurt", 159, 6.0, 24, 4.0),
    createData("Gingerbread", 356, 16.0, 49, 3.9),
    createData("Honeycomb", 408, 3.2, 87, 6.5),
    createData("Ice cream sandwich", 237, 9.0, 37, 4.3),
    createData("Jelly Bean", 375, 0.0, 94, 0.0),
    createData("KitKat", 518, 26.0, 65, 7.0),
    createData("Lollipop", 392, 0.2, 98, 0.0),
    createData("Marshmallow", 318, 0, 81, 2.0),
    createData("Nougat", 360, 19.0, 9, 37.0),
    createData("Oreo", 437, 18.0, 63, 4.0),
    createData("Cupcake 1", 305, 3.7, 67, 4.3),
    createData("Donut 1", 452, 25.0, 51, 4.9),
    createData("Eclair 1", 262, 16.0, 24, 6.0),
    createData("Frozen yoghurt 1", 159, 6.0, 24, 4.0),
    createData("Gingerbread 1", 356, 16.0, 49, 3.9),
    createData("Honeycomb 1", 408, 3.2, 87, 6.5),
    createData("Ice cream sandwich 1", 237, 9.0, 37, 4.3),
    createData("Jelly Bean 1", 375, 0.0, 94, 0.0),
    createData("KitKat 1", 518, 26.0, 65, 7.0),
    createData("Lollipop 1", 392, 0.2, 98, 0.0),
    createData("Marshmallow 1", 318, 0, 81, 2.0),
    createData("Nougat 1", 360, 19.0, 9, 37.0),
    createData("Oreo 1", 437, 18.0, 63, 4.0),
];

export const headCells: any[] = [
    {
        name: "name",
        text: "Dessert (100g serving)",
    },
    { name: "calories", text: "Calories" },
    { name: "fat", text: "Fat (g)" },
    { name: "carbs", text: "Carbs (g)" },
    { name: "protein", text: "Protein (g)" },
];

//@ts-ignore
const actions: TableAction[] = [
    {
        name: "details",
        text: "Details",
    },
    {
        name: "multiple",
        text: "Multiple",
        multiple: true,
        onClick: (...rest) => console.log("multiple", ...rest),
    },
    {
        name: "single",
        text: "Single",
        onClick: (...rest) => console.log("single", ...rest),
    },
];

//@ts-ignore
const justMultiple: TableAction[] = [
    {
        name: "multiple",
        text: "Multiple",
        multiple: true,
        onClick: (...rest) => console.log("multiple", ...rest),
    },
];

//@ts-ignore
const justSingle: TableAction[] = [
    {
        name: "single",
        text: "Single",
        onClick: (...rest) => console.log("single", ...rest),
    },
];

//@ts-ignore
const differentPrimary: TableAction[] = [
    {
        name: "details",
        text: "Details",
    },
    {
        name: "multiple",
        text: "Multiple",
        multiple: true,
        onClick: (...rest) => console.log("multiple", ...rest),
    },
    {
        name: "single",
        text: "Single",
        onClick: (...rest) => console.log("single", ...rest),
    },
    {
        name: "primary",
        text: "Primary",
        onClick: (...rest) => console.log("primary", ...rest),
    },
];

export default function Example() {
    //@ts-ignore
    const [filteredRows, updateRows] = useState(rows);
    return (
        <div>
            <div>
                <ObjectsTable
                    rows={filteredRows}
                    columns={headCells}
                    //initialSorting={{ orderBy: "carbs", order: "asc" }}
                    /**initialPagination={{
                        pageSizeOptions: [5, 10, 15],
                        total: filteredRows.length,
                        page: 1,
                        pageSize: 10
                    }}**/
                    //actions={actions}
                    //initialSelection={["Cupcake", "Donut", "Eclair"]}
                    //detailFields={headCells}
                    //actions={justMultiple}
                    //actions={justSingle}
                    //actions={differentPrimary}
                    //initialSearch={"eclair"}
                    //onButtonClick={() => console.log("Button clicked")}
                    //buttonLabel={"Create dessert"}
                    //onChangeSearch={search => updateRows(search ? [rows[0]] : rows)}
                    //idsForSelectInAllPages={null} // equivalent to [], pending to study with arnau
                    //forceSelectionColumn={false}
                    /**tableNotifications={[{
                        message: <Typography style={{color: "red"}}>Fatal error!</Typography>
                    }]}**/
                    //filterComponents={<Checkbox />}
                />
            </div>
        </div>
    );
}
