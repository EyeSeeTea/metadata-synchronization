## Why

Sync history in the DEV environment is occasionally getting completely wiped. The root cause is that `StorageDataStoreClient.getObject()` catches **all** errors (including network failures, 5xx, timeouts) and silently returns `undefined`. All collection mutation methods (`saveObjectInCollection`, `removeObjectsInCollection`, etc.) treat `undefined` as "empty collection" via `(await this.getObject(key)) ?? []`, then overwrite the dataStore key with the result. A single transient network error during any sync report save or history cleanup wipes the entire history.

## What Changes

- **Distinguish 404 from transient errors in `StorageDataStoreClient.getObject()`**: Return `undefined` only for 404 (key genuinely does not exist). Re-throw on network errors, 5xx, timeouts, etc.
- **Add error propagation in collection mutation methods**: `saveObjectInCollection`, `saveObjectsInCollection`, `removeObjectInCollection`, and `removeObjectsInCollection` in `StorageClient` must not silently treat a failed read as an empty collection. If `getObject` throws, the error must propagate up rather than being swallowed into `?? []`.

## Capabilities

### New Capabilities

_(none — this is a bug fix to existing storage behavior)_

### Modified Capabilities

_(no spec-level requirement changes — the storage client was always supposed to preserve data on transient errors)_

## Impact

- **Code**: `src/data/storage/StorageDataStoreClient.ts` (error handling in `getObject`), `src/domain/storage/repositories/StorageClient.ts` (collection mutation methods)
- **User impact**: Sync history will no longer be wiped by transient network errors. Users will see error messages instead of silent data loss.
- **Risk**: Medium — `getObject` is used widely. The change must carefully distinguish 404 from other errors to avoid breaking callers that legitimately expect `undefined` for missing keys. Other `StorageClient` implementations (`StorageConstantClient`) need the same treatment.
