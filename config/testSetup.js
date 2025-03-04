global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
};
