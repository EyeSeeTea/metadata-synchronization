## Context

The `StorageDataStoreClient.getObject()` method wraps DHIS2 dataStore GET calls. Currently it catches all errors and returns `undefined`:

```typescript
public async getObject<T extends object>(key: string): Promise<T | undefined> {
    try {
        const value = await this.dataStore.get<T>(key).getData();
        return value;
    } catch (error: any) {
        console.error(error);
        return undefined;  // 404 AND network errors both return undefined
    }
}
```

All collection mutation methods in the abstract `StorageClient` base class use the pattern `(await this.getObject(key)) ?? []` to read existing data before writing. When `getObject` returns `undefined` due to a transient error, the collection is treated as empty and overwritten.

This affects history directly: every `reports.save()` call during a sync and every `useDeleteHistory` run on app load go through `saveObjectInCollection("history", ...)`.

## Goals / Non-Goals

**Goals:**
- Prevent history wipe caused by transient dataStore read errors
- Distinguish "key not found" (404) from "request failed" (network/5xx) in `getObject`
- Ensure collection mutation methods propagate read errors instead of treating them as empty collections

**Non-Goals:**
- Adding retry logic to dataStore operations (can be a follow-up)
- Fixing the scheduler race condition where concurrent syncs lose each other's reports (separate concern, requires locking or append-only writes)
- Migrating all callers from `getObject` to `getObjectFuture` (ongoing refactor, out of scope)

## Decisions

### 1. Make `getObject` only return `undefined` for 404, re-throw other errors

**Change**: In `StorageDataStoreClient.getObject()`, inspect the error response status. Return `undefined` only when the status is 404 (key not found). For all other errors (network, 5xx, timeout), re-throw.

```typescript
public async getObject<T extends object>(key: string): Promise<T | undefined> {
    try {
        const value = await this.dataStore.get<T>(key).getData();
        return value;
    } catch (error: any) {
        if (error?.response?.status === 404) {
            return undefined;
        }
        throw error;
    }
}
```

**Rationale**: This is the minimal change that fixes the bug. Callers that handle `undefined` for missing keys continue working. Callers that assumed errors were silently swallowed will now see exceptions — which is the correct behavior since they were unknowingly losing data.

**Alternatives considered:**
- Adding a separate `getObjectOrThrow` method — adds API surface without fixing the root cause; all existing callers would still silently swallow.
- Returning a `Result<T | undefined, Error>` — good long-term but too invasive for a bug fix; the codebase is already migrating to Futures.

### 2. Apply the same fix to `StorageConstantClient`

**Change**: Check if `StorageConstantClient.getObject()` has the same silent-catch pattern and fix it consistently.

**Rationale**: Both storage backends must behave the same way to prevent the bug regardless of which backend is configured.

### 3. No change to collection mutation methods

**Rationale**: Once `getObject` properly throws on transient errors, the `?? []` fallback in `saveObjectInCollection` etc. will only trigger for genuinely missing keys (404 → `undefined`). The error will naturally propagate up through the `await this.getObject(key)` call. No changes needed in `StorageClient.ts`.

### 4. Apply same fix to `getOrCreateObject`

**Change**: `getOrCreateObject` calls `getObject` and creates a default if it returns `undefined`. With the fix, a transient error will throw instead of creating a spurious default. This is correct behavior — we should not create a default object because the network was flaky.

## Risks / Trade-offs

- **[Medium] Callers that relied on silent error swallowing** → Some callers may have implicitly depended on `getObject` never throwing. These will now see unhandled exceptions. This is intentional — it surfaces bugs rather than silently losing data. Each caller should handle errors appropriately (show user message, retry, etc.).
- **[Low] 404 detection heuristic** → The d2-api library wraps errors with a `response` object. If the error shape changes in future d2-api versions, the 404 check may need updating. This risk is low since d2-api follows standard axios error conventions.
- **[Low] `getMetadataByKey` in StorageDataStoreClient** → This private method also silently catches errors and returns `undefined`. It should get the same treatment for consistency but is lower priority since it's only used for sharing operations, not collection mutations.
