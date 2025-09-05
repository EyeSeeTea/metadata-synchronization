// Global fail function for jest backward compatibility
declare global {
    function fail(reason?: any): never;
}

globalThis.fail = (reason?: any) => {
    throw new Error(reason);
};

export {};
