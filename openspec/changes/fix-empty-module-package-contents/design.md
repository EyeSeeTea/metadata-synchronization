## Context

`CreatePackageUseCase.execute()` builds a metadata package from a module by calling `metadataPayloadBuilder.build(syncBuilder)` — an async method that returns `Promise<MetadataPackage>`. A refactor (commit fb983808) replaced the previous `await`-ed call with the builder pattern but dropped the `await` keyword. The result is that a raw Promise object is passed through `mapPackageTo()` and stored as the package `contents`, which serializes to `{}` in the dataStore.

Every downstream operation (import, download JSON, diff, mapping) reads `contents` and finds it empty, producing the four symptoms reported in the ticket.

The "create package from file" path is unaffected because its `contents` parameter is already resolved — the ternary short-circuits before hitting the builder call.

## Goals / Non-Goals

**Goals:**
- Restore correct metadata inclusion in packages generated from modules
- Prevent this class of bug from reoccurring via improved type constraints
- Add a unit test for `CreatePackageUseCase` covering the payload resolution path

**Non-Goals:**
- Fixing or recovering previously-generated broken packages (users can regenerate)
- Changing the package format or storage schema
- Refactoring the broader transformation pipeline

## Decisions

### 1. Add missing `await` in CreatePackageUseCase (line 41)

**Change:** `this.metadataPayloadBuilder.build(syncBuilder)` → `await this.metadataPayloadBuilder.build(syncBuilder)`

**Rationale:** This is the minimal, correct fix. All other call sites (`DiffPackageUseCase`, `DownloadModuleSnapshotUseCase`, `CreatePullRequestUseCase`) already `await` the same method. The function is already `async`, so no signature change is needed.

**Alternatives considered:**
- Making `build()` synchronous — not feasible, it performs API calls to fetch metadata.

### 2. Constrain `mapPackageTo` generic to exclude Promise types

**Change:** Add a type constraint to the `Input` parameter of `TransformationRepository.mapPackageTo` so that `Promise<T>` is rejected at compile time.

**Current signature:**
```typescript
mapPackageTo<Input = MetadataPackage, Output = MetadataPackage>(
    destination: number,
    payload: Input,  // accepts anything, including Promise
    ...
): Output;
```

**Proposed signature:**
```typescript
mapPackageTo(
    destination: number,
    payload: MetadataPackage,
    ...
): MetadataPackage;
```

**Rationale:** The generic type parameters `Input` and `Output` are only defaulted to `MetadataPackage` — they don't constrain it. Every call site in the codebase passes `MetadataPackage` in and expects `MetadataPackage` out, so the generics add no value and actively hide bugs. Removing them makes the interface honest about what it accepts.

**Alternatives considered:**
- Adding a `NoPromise<T>` conditional type constraint — overly clever, harder to understand.
- Keeping generics but adding `extends MetadataPackage` — same effect as removing them, but more verbose.

### 3. Add unit test for CreatePackageUseCase

**Rationale:** The use case currently has no unit tests, which allowed this regression to go undetected. A test that verifies the stored package `contents` is a resolved `MetadataPackage` (not a Promise) will catch this class of bug.

## Risks / Trade-offs

- **[Low] Removing generics from `mapPackageTo`/`mapPackageFrom`** → Any call site that relied on the generic flexibility will fail to compile. A codebase search confirms no call site uses non-default type arguments, so this risk is effectively zero.
- **[Low] Existing broken packages in dataStore** → Packages generated while the bug was active contain empty `contents`. Users need to regenerate these packages. No migration is needed since the storage format itself is correct; only the data was wrong.
