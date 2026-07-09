## Context

Category options in DHIS2 can belong to multiple categories. The mapping system uses a composite ID format `"{categoryId}-{categoryOptionId}"` to disambiguate which category context a mapping applies in. This composite format is used in nested mapping (within a category combo) by `CategoryOptionMappedModel.modelTransform`.

However, in **global mapping**, category options should be listed once each with their plain DHIS2 ID — they're mapped globally regardless of which category they belong to. The current code has three intertwined problems:

1. **`MappingDialog` always uses `modelFactory("categoryOptions")`** which resolves to `CategoryOptionMappedModel` (the first class with `mappingType = "categoryOptions"`). This model's `modelTransform` expands each option into N rows by category → duplicates.

2. **ID format mismatch on read-back**: When a user selects a destination item, the composite ID (e.g. `"catA-opt1"`) is stored as `mappedId`. When re-opening, `MappingDialog` strips it to plain ID via `_.last(split("-"))` → `"opt1"`. But the table lists composite IDs, so `"opt1"` matches nothing → selection appears lost.

3. **Automap stores plain IDs**: `lookupSimilar()` returns plain DHIS2 IDs. With `initialShowOnlySelected=true` and composite IDs in the table, the result is invisible.

The backend consumer (`mapCategoryOptionCombo` in `src/utils/synchronization.ts`) already handles both formats using `_.last(candidate.split("-"))`, so fixing the UI won't break sync operations.

## Goals / Non-Goals

**Goals:**
- Each category option appears exactly once in the global mapping destination picker
- Selected mappings are visually persistent when re-opening the dialog
- Automap results are visible in the selection window
- Nested (non-global) category option mapping continues to work with composite IDs

**Non-Goals:**
- Changing the mapping storage format in the dataStore
- Modifying the backend sync consumer (`mapCategoryOptionCombo`)
- Fixing mapping for other metadata types

## Decisions

### 1. Use plain `CategoryOptionModel` for the global mapping destination picker

**Change:** In `MappingDialog`, when the mapping context is global category options, use a model that does NOT have the category-exploding `modelTransform`. This can be done by passing the appropriate model from the `MappingTable` (which already knows whether it's global or nested) instead of re-resolving via `modelFactory`.

**Rationale:** The `MappingTable` already holds the model class for the source rows. For global mapping, this is `GlobalCategoryOptionModel` (no transform). The destination picker should use the same kind of model — plain category options without category expansion.

**Approach:** Add the model (or mappingType context) to `MappingDialogConfig` so `MappingDialog` can use it directly instead of calling `modelFactory(mappingType)`. When a global model is provided, the dialog uses it; otherwise it falls back to the current `modelFactory` behavior for backward compatibility with nested mapping.

**Alternatives considered:**
- Creating a separate `GlobalCategoryOptionDestinationModel` — too many model classes already, adds complexity.
- Modifying `modelFactory` to accept a "global" flag — leaks UI concerns into the factory.

### 2. Store and read back plain IDs consistently for global category options

**Change:** Since the destination picker will now list plain IDs (no composite), the `mappedId` stored will also be plain. The `mappedId` read-back logic in `MappingDialog` (lines 56-64) using `_.last(split("-"))` will naturally produce the correct plain ID. No change needed to the read-back logic — it already handles plain IDs correctly (`_.last("opt1".split("-"))` = `"opt1"`).

**Rationale:** With plain IDs in both storage and display, the selection will match correctly when the dialog is re-opened.

### 3. No change needed for automap

**Change:** None. Automap already stores plain IDs. Once the destination picker uses plain IDs too, the automap result will match rows correctly.

**Rationale:** The automap bug is a symptom of the same root cause (composite vs plain ID mismatch in the destination table). Fixing decision #1 resolves it automatically.

## Risks / Trade-offs

- **[Low] Existing global mappings with composite `mappedId` values** → The `_.last(split("-"))` read-back logic already strips these to plain IDs, so existing stored mappings will display correctly. New mappings will be stored with plain IDs. The backend consumer handles both formats.
- **[Low] Nested (non-global) category option mapping** → Unchanged. The `MappingDialog` will only use the plain model when a global-context model is explicitly provided; nested mapping continues using `CategoryOptionMappedModel` via `modelFactory`.
