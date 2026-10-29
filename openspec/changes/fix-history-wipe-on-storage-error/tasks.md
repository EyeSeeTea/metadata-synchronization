## 1. Fix error handling in StorageDataStoreClient.getObject

- [ ] 1.1 [BE] In `src/data/storage/StorageDataStoreClient.ts`, modify `getObject()` to only return `undefined` for 404 errors and re-throw all other errors (network, 5xx, timeout)
- [ ] 1.2 [BE] Apply the same fix to `getMetadataByKey()` in the same file for consistency

## 2. Fix error handling in StorageConstantClient

- [ ] 2.1 [BE] Check `StorageConstantClient.getObject()` for the same silent-catch pattern and apply the same 404-only-undefined fix

## 3. Unit Tests

- [ ] 3.1 [BE] Add unit tests for `StorageDataStoreClient.getObject()` verifying: returns undefined on 404, throws on 500, throws on network error
- [ ] 3.2 [BE] Add unit test verifying `saveObjectInCollection` propagates the error when `getObject` throws (does not overwrite with empty data)
- [ ] 3.3 [BE] Run `yarn test` to confirm all existing tests pass

## 4. Validation

- [ ] 4.1 [BE] Run `yarn test` and `yarn build core-app` to confirm everything compiles and passes
