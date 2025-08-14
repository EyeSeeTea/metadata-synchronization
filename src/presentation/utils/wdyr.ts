/// <reference types="@welldone-software/why-did-you-render" />

import React from "react";

if (import.meta.env.MODE === "development") {
    import("@welldone-software/why-did-you-render").then(whyDidYouRenderModule => {
        const whyDidYouRender = whyDidYouRenderModule.default;

        whyDidYouRender(React, {
            trackAllPureComponents: true,
        });
    });
}
