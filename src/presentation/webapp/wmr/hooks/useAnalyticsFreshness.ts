import React from "react";
import { useAppContext } from "../../../react/core/contexts/AppContext";

export type AnalyticsFreshness = Readonly<
    { type: "loading" } | { type: "lastRun"; date: Date } | { type: "neverRun" } | { type: "unknown" }
>;

export function useAnalyticsFreshness(): AnalyticsFreshness {
    const { compositionRoot } = useAppContext();
    const [analyticsFreshness, setAnalyticsFreshness] = React.useState<AnalyticsFreshness>({ type: "loading" });

    React.useEffect(() => {
        async function getAnalyticsFreshness() {
            try {
                const { lastAnalyticsTableSuccess } = await compositionRoot.systemInfo.get();
                setAnalyticsFreshness(
                    lastAnalyticsTableSuccess
                        ? { type: "lastRun", date: lastAnalyticsTableSuccess }
                        : { type: "neverRun" }
                );
            } catch {
                setAnalyticsFreshness({ type: "unknown" });
            }
        }

        getAnalyticsFreshness();
    }, [compositionRoot]);

    return analyticsFreshness;
}
