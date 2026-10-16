## ADDED Requirements

### Requirement: StorageClient.getObject SHALL distinguish missing keys from transient errors

When `getObject` is called and the dataStore key does not exist (HTTP 404), the method MUST return `undefined`. When `getObject` is called and the request fails for any other reason (network error, HTTP 5xx, timeout), the method MUST throw an error rather than returning `undefined`.

#### Scenario: Missing key returns undefined
- **WHEN** `getObject("nonexistent-key")` is called and the dataStore returns HTTP 404
- **THEN** the method SHALL return `undefined`

#### Scenario: Network error throws instead of returning undefined
- **WHEN** `getObject("history")` is called and the dataStore request fails with a network error
- **THEN** the method SHALL throw an error

#### Scenario: Server error throws instead of returning undefined
- **WHEN** `getObject("history")` is called and the dataStore returns HTTP 500
- **THEN** the method SHALL throw an error

### Requirement: Collection mutation methods SHALL NOT overwrite data on read failure

When `saveObjectInCollection`, `saveObjectsInCollection`, `removeObjectInCollection`, or `removeObjectsInCollection` fail to read the existing collection due to a transient error, the method MUST propagate the error rather than treating the collection as empty and overwriting it.

#### Scenario: saveObjectInCollection propagates read error
- **WHEN** `saveObjectInCollection("history", newEntry)` is called
- **AND** the read of existing history fails with a transient error
- **THEN** the method SHALL throw an error without modifying the dataStore

#### Scenario: removeObjectsInCollection propagates read error
- **WHEN** `removeObjectsInCollection("history", ids)` is called
- **AND** the read of existing history fails with a transient error
- **THEN** the method SHALL throw an error without modifying the dataStore

### Requirement: Error handling SHALL be consistent across storage backends

Both `StorageDataStoreClient` and `StorageConstantClient` MUST implement the same error-handling semantics for `getObject`: return `undefined` only for missing keys, throw for transient errors.

#### Scenario: StorageConstantClient follows same error contract
- **WHEN** `StorageConstantClient.getObject()` encounters a non-404 error
- **THEN** the method SHALL throw an error rather than returning `undefined`
