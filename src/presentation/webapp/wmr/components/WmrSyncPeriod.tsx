import { Typography } from "@material-ui/core";
import { getWmrMonthStart, WmrMonthRange } from "../../../../domain/entities/wmr/entities/WmrSyncFlow";
import i18n from "../../../../utils/i18n";

type WmrSyncPeriodProps = Readonly<{ year: string; monthRange?: WmrMonthRange }>;

export function WmrSyncPeriod({ year, monthRange }: WmrSyncPeriodProps) {
    return <Typography variant="body2">{describeWmrSyncPeriod(year, monthRange)}</Typography>;
}

export function describeWmrSyncPeriod(year: string, monthRange?: WmrMonthRange, locale?: string): string {
    if (!monthRange) {
        return i18n.t("Period: {{year}}", { year, nsSeparator: false, interpolation: { escapeValue: false } });
    }
    if (monthRange.from === monthRange.to) {
        return i18n.t("Period: {{year}}, {{month}} only", {
            year,
            month: formatMonthOfYear(monthRange.from, locale),
            nsSeparator: false,
            interpolation: { escapeValue: false },
        });
    }
    return i18n.t("Period: {{year}}, sum of {{from}} to {{to}}", {
        year,
        from: formatMonthOfYear(monthRange.from, locale),
        to: formatMonthOfYear(monthRange.to, locale),
        nsSeparator: false,
        interpolation: { escapeValue: false },
    });
}

export function formatWmrMonthName(month: string, locale?: string): string {
    const name = new Intl.DateTimeFormat(locale, { month: "long" }).format(getWmrMonthStart(month));
    return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
}

function formatMonthOfYear(month: string, locale: string | undefined): string {
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(getWmrMonthStart(month));
}
