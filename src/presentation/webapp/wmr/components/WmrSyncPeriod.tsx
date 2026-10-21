import { Typography } from "@material-ui/core";
import i18n from "../../../../utils/i18n";

type WmrSyncPeriodProps = Readonly<{ year: string; sumsMonths: boolean }>;

export function WmrSyncPeriod({ year, sumsMonths }: WmrSyncPeriodProps) {
    return <Typography variant="body2">{describeWmrSyncPeriod(year, sumsMonths)}</Typography>;
}

export function describeWmrSyncPeriod(year: string, sumsMonths: boolean, locale?: string): string {
    const options = { nsSeparator: false, interpolation: { escapeValue: false } } as const;
    return sumsMonths
        ? i18n.t("Period: {{year}}, sum of {{from}} to {{to}}", {
              year,
              from: formatMonth(year, 0, locale),
              to: formatMonth(year, 11, locale),
              ...options,
          })
        : i18n.t("Period: {{year}}", { year, ...options });
}

function formatMonth(year: string, monthIndex: number, locale: string | undefined): string {
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
        new Date(Number(year), monthIndex, 1)
    );
}
