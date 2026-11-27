import { Logger } from "../../Logger";

export class MockLogger implements Logger {
    readonly errors: { name: string; message: string }[] = [];

    trace(name: string, message: string): void {
        console.debug(`[TRACE] ${name}: ${message}`);
    }
    fatal(name: string, message: string): void {
        console.error(`[FATAL] ${name}: ${message}`);
    }
    mark(name: string, message: string): void {
        console.debug(`[MARK] ${name}: ${message}`);
    }
    debug(...args: any[]): void {
        console.debug(`[DEBUG]`, ...args);
    }
    error(name: string, message: string): void {
        this.errors.push({ name, message });
    }
    info(...args: any[]): void {
        console.debug(`[INFO]`, ...args);
    }
    warn(...args: any[]): void {
        console.warn(`[WARN]`, ...args);
    }
}
