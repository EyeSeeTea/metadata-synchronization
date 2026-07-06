import { useCallback, useEffect, useMemo, useState } from "react";
import { AppContextState } from "../../contexts/AppContext";

export interface MigrationsState {
    type: "checking" | "pending" | "checked" | "error";
    message?: string;
}

export interface UseMigrationsResult {
    state: MigrationsState;
    onFinish: () => void;
}

export function useMigrations(appContext: AppContextState | null): UseMigrationsResult {
    const [state, setState] = useState<MigrationsState>({ type: "checking" });
    const onFinish = useCallback(() => setState({ type: "checked" }), [setState]);

    useEffect(() => {
        appContext?.compositionRoot.migrations
            .hasPending()
            .then(pendingMigrations => setState({ type: pendingMigrations ? "pending" : "checked" }))
            .catch((error: any) => setState({ type: "error", message: error?.message ?? "Unknown error" }));
    }, [appContext]);

    const result = useMemo(() => ({ state, onFinish }), [state, onFinish]);

    return result;
}
