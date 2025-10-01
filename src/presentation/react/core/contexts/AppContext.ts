import React, { useContext } from "react";
import { CompositionRoot } from "../../../CompositionRoot";
import { D2Api } from "../../../../types/d2-api";
import { NewCompositionRoot } from "../../../NewCompositionRoot";
import { User } from "../../../../domain/user/entities/User";

export interface AppContextState {
    api: D2Api;
    d2: object;
    compositionRoot: CompositionRoot;
    newCompositionRoot: NewCompositionRoot;
    currentUser: User;
}

export const AppContext = React.createContext<AppContextState | null>(null);

export function useAppContext() {
    const context = useContext(AppContext);
    if (context) {
        return context;
    } else {
        throw new Error("Context not found");
    }
}
