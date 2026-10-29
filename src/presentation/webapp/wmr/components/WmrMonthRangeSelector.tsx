import { Box, FormControl, InputLabel, MenuItem, Select } from "@material-ui/core";
import {
    getWmrRangeEndMonths,
    getWmrYearMonths,
    updateWmrRangeStart,
    WmrMonthRange,
} from "../../../../domain/entities/wmr/entities/WmrSyncFlow";
import i18n from "../../../../utils/i18n";
import { formatWmrMonthName } from "./WmrSyncPeriod";

type WmrMonthRangeSelectorProps = Readonly<{
    year: string;
    range: WmrMonthRange;
    disabled: boolean;
    onChange: (range: WmrMonthRange) => void;
}>;

export function WmrMonthRangeSelector({ year, range, disabled, onChange }: WmrMonthRangeSelectorProps) {
    const months = getWmrYearMonths(year);

    return (
        <Box display="flex" flexWrap="wrap" mt={1}>
            <MonthSelect
                id="wmr-month-from"
                label={i18n.t("From")}
                months={months}
                value={range.from}
                disabled={disabled}
                onChange={from => onChange(updateWmrRangeStart(range, from))}
            />
            <MonthSelect
                id="wmr-month-to"
                label={i18n.t("To")}
                months={getWmrRangeEndMonths(months, range)}
                value={range.to}
                disabled={disabled}
                onChange={to => onChange({ ...range, to })}
            />
        </Box>
    );
}

type MonthSelectProps = Readonly<{
    id: string;
    label: string;
    months: ReadonlyArray<string>;
    value: string;
    disabled: boolean;
    onChange: (month: string) => void;
}>;

function MonthSelect({ id, label, months, value, disabled, onChange }: MonthSelectProps) {
    const labelId = `${id}-label`;

    return (
        <Box minWidth={180} mr={2}>
            <FormControl fullWidth disabled={disabled}>
                <InputLabel id={labelId}>{label}</InputLabel>
                <Select
                    labelId={labelId}
                    id={id}
                    value={value}
                    onChange={event => onChange(String(event.target.value))}
                >
                    {months.map(month => (
                        <MenuItem key={month} value={month}>
                            {formatWmrMonthName(month)}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>
    );
}
