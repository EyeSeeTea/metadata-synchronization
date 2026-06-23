/**
 * Converts an unknown thrown value into a readable, log-friendly string,
 * avoiding the "{}" that `JSON.stringify` produces for Error/axios objects.
 */
export function getErrorMessage(error: unknown): string {
    if (typeof error === "string") return error;

    if (error && typeof error === "object") {
        // Axios / D2Api error: the DHIS2 payload carries the real message and conflicts.
        const response = (error as { response?: { status?: number; data?: unknown } }).response;
        if (response) {
            const status = response.status !== undefined ? `HTTP ${response.status}` : "HTTP error";
            const data = safeStringify(response.data);
            return data ? `${status}: ${data}` : status;
        }

        if (error instanceof Error) {
            return error.stack ? `${error.message}\n${error.stack}` : error.message;
        }
    }

    return safeStringify(error) ?? String(error);
}

function safeStringify(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "string") return value;

    try {
        return JSON.stringify(value);
    } catch {
        return undefined;
    }
}
