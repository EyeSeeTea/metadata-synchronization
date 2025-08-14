import React, { Suspense } from "react";

const App = React.lazy(() => {
    switch (import.meta.env.VITE_PRESENTATION_TYPE) {
        case "widget": {
            return import("./widget/WidgetApp");
        }
        default: {
            return import("./webapp/WebApp");
        }
    }
});

export const PresentationLoader: React.FC = () => {
    return (
        <Suspense fallback={null}>
            <App />
        </Suspense>
    );
};
