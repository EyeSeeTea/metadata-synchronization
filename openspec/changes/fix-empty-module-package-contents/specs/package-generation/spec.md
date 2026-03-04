## ADDED Requirements

### Requirement: Package generation SHALL resolve metadata payload before storage

When `CreatePackageUseCase` generates a package from a module, it MUST await the `MetadataPayloadBuilder.build()` call so that the resolved `MetadataPackage` — not a Promise — is stored as the package contents.

#### Scenario: Module package contains metadata objects after generation
- **WHEN** a user generates a package from a module that references a dataset
- **THEN** the stored package `contents` SHALL include the dataset and its dependent metadata objects

#### Scenario: Package contents are serializable as valid metadata JSON
- **WHEN** a module package is generated and saved to the dataStore
- **THEN** the `contents` field SHALL be a plain object with metadata type keys (e.g., `dataSets`, `dataElements`), not a Promise or empty object

### Requirement: TransformationRepository SHALL reject non-MetadataPackage payloads at compile time

The `mapPackageTo` and `mapPackageFrom` methods MUST accept only `MetadataPackage` as the payload type, preventing Promise objects or other incorrect types from being passed silently.

#### Scenario: Passing a Promise to mapPackageTo causes a compile error
- **WHEN** a developer passes `Promise<MetadataPackage>` as the payload argument to `mapPackageTo`
- **THEN** the TypeScript compiler SHALL report a type error

#### Scenario: Passing MetadataPackage to mapPackageTo compiles successfully
- **WHEN** a developer passes a resolved `MetadataPackage` as the payload argument to `mapPackageTo`
- **THEN** the TypeScript compiler SHALL accept the call without error
