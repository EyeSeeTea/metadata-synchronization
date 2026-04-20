export class InmemoryCache {
    private cache: Map<string, unknown> = new Map();

    getKeys(): string[] {
        return Array.from(this.cache.keys());
    }

    get<T>(cacheKey: string): T {
        return this.cache.get(cacheKey) as T;
    }

    async getOrPromise<T>(cacheKey: string, promise: () => Promise<T>): Promise<T> {
        if (this.cache.has(cacheKey)) {
            const data = this.cache.get(cacheKey) as T;
            return Promise.resolve(data);
        } else {
            const data = await promise();
            this.cache.set(cacheKey, data);
            return data;
        }
    }

    clear(): void {
        this.cache.clear();
    }
}
