## Why

When generating a package from a module, the package is saved with empty contents — the actual metadata objects (datasets, data elements, etc.) are missing. This causes four user-visible failures: imports report 0 elements, downloaded JSONs lack metadata, comparisons always show "ok", and the mapping tab is empty. The root cause is a missing `await` on an async call introduced during a refactor (commit fb983808), meaning a Promise object is stored instead of the resolved metadata payload.

## What Changes

- **Fix async/await bug in `CreatePackageUseCase`**: Add the missing `await` keyword when calling `metadataPayloadBuilder.build()` so the resolved `MetadataPackage` is stored instead of a Promise object.
- **Add type safety to `TransformationRepository.mapPackageTo`**: Tighten the generic type parameter to prevent `Promise` objects from being silently accepted as payload input, making this class of bug a compile-time error.

## Capabilities

### New Capabilities

_(none — this is a bug fix, no new capabilities are introduced)_

### Modified Capabilities

_(no spec-level requirement changes — the existing behavior was correct by design, only the implementation was broken)_

## Impact

- **Code**: `src/domain/packages/usecases/CreatePackageUseCase.ts` (primary fix), `src/domain/transformations/repositories/TransformationRepository.ts` (type hardening)
- **User impact**: All module-generated packages will now contain their full metadata payload, restoring import, download, comparison, and mapping functionality
- **Risk**: Minimal — the fix aligns this call site with every other `metadataPayloadBuilder.build()` call in the codebase, all of which already use `await`
