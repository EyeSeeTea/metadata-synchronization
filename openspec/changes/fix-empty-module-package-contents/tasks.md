## 1. Fix Missing Await in CreatePackageUseCase

- [ ] 1.1 [BE] Add `await` before `this.metadataPayloadBuilder.build(syncBuilder)` in `src/domain/packages/usecases/CreatePackageUseCase.ts` line 41

## 2. Type Safety Improvement

- [ ] 2.1 [BE] Remove generic type parameters from `mapPackageTo` and `mapPackageFrom` in `src/domain/transformations/repositories/TransformationRepository.ts`, replacing `Input`/`Output` with concrete `MetadataPackage` type
- [ ] 2.2 [BE] Update `TransformationRepositoryImpl` (data layer) to match the new non-generic signature
- [ ] 2.3 [BE] Verify all call sites compile cleanly with the tightened types (`yarn test` type-check)

## 3. Unit Tests

- [ ] 3.1 [BE] Create `CreatePackageUseCase.spec.ts` with a test that verifies the stored package `contents` is a resolved `MetadataPackage` (not a Promise or empty object)
- [ ] 3.2 [BE] Run `yarn test` to confirm all existing tests pass alongside the new test

## 4. Validation

- [ ] 4.1 [BE] Run full type-check and build: `yarn test` and `yarn build core-app`
