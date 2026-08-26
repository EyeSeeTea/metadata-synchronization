## 1. Pass model from MappingTable to MappingDialog

- [ ] 1.1 [FE] Add a `model` field to `MappingDialogConfig` in `MappingDialog.tsx` so the caller can specify which model the destination picker should use
- [ ] 1.2 [FE] In `MappingDialog`, use the provided `model` from config when available, falling back to `modelFactory(mappingType)` for backward compatibility
- [ ] 1.3 [FE] In `MappingTable.tsx`, pass the current source model (which is `GlobalCategoryOptionModel` for global mapping) when opening the `MappingDialog`

## 2. Verify ID consistency

- [ ] 2.1 [FE] Verify that with the plain model in the destination picker, stored `mappedId` values are plain IDs, and `_.last(split("-"))` read-back produces matching values
- [ ] 2.2 [FE] Verify that nested (non-global) category option mapping still works by confirming the fallback to `modelFactory` produces `CategoryOptionMappedModel` with composite IDs

## 3. Unit Tests

- [ ] 3.1 [FE] Add a test verifying `MappingDialog` uses the provided model instead of calling `modelFactory` when a model is passed in the config
- [ ] 3.2 [FE] Run `yarn test` to confirm all existing tests pass

## 4. Validation

- [ ] 4.1 [FE] Run `yarn test` and `yarn build core-app` to confirm everything compiles and passes
