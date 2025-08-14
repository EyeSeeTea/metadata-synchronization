import { defineConfig, loadEnv, ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = { ...process.env, ...loadEnv(mode, process.cwd()) };
    const proxy = getProxy(env);

    return {
        base: "", // Relative paths
        plugins: [
            react(),
            nodePolyfills({
                // Enable polyfills for specific globals and modules
                globals: {
                    Buffer: true,
                    global: true,
                    process: true,
                },
                // Include additional Node.js modules
                include: [
                    "crypto",
                    "stream",
                    "buffer",
                    "util",
                    "os",
                    "events",
                    "process",
                    "path",
                    "http",
                    "https",
                    "zlib",
                    "vm",
                ],
                protocolImports: true,
            }),
        ],
        define: {
            // Preserve process.env access for compatibility
            "process.env.NODE_ENV": JSON.stringify(env.NODE_ENV || mode),
            // Polyfill Node.js globals
            __dirname: JSON.stringify("/"),
            __filename: JSON.stringify("/index.js"),
            // Process version needed by webcrypto polyfills
            "process.version": JSON.stringify("v20.19.4"),
        },
        esbuild: {
            define: {
                // Use esbuild define for global to avoid affecting import paths
                global: "globalThis",
            },
        },
        build: {
            outDir: "build",
            rollupOptions: {
                input: {
                    main: resolve(process.cwd(), "index.html"),
                },
            },
        },
        server: {
            port: parseInt(env.PORT || "8081"),
            proxy: proxy,
        },
        envPrefix: "VITE_",
    };
});

function getProxy(env: Record<string, string | undefined>): Record<string, ProxyOptions> {
    const dhis2UrlVar = "VITE_DHIS2_BASE_URL";
    const dhis2AuthVar = "VITE_DHIS2_AUTH";
    const targetUrl = env[dhis2UrlVar];
    const auth = env[dhis2AuthVar];
    const isBuild = env.NODE_ENV === "production";

    if (isBuild) {
        return {};
    } else if (!targetUrl) {
        console.error(`Set ${dhis2UrlVar}`);
        process.exit(1);
    } else if (!auth) {
        console.error(`Set ${dhis2AuthVar}`);
        process.exit(1);
    } else {
        return {
            "/dhis2": {
                target: targetUrl,
                changeOrigin: true,
                auth: auth,
                rewrite: path => path.replace(/^\/dhis2/, ""),
            },
        };
    }
}
