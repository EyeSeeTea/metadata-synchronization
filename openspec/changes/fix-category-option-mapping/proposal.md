## Why

Category option mapping in Global Mapping is broken in three ways: the destination picker shows duplicate entries (one per category a category option belongs to), selected mappings appear lost when re-opening the dialog, and automap results are invisible in the selection window. All three stem from an inconsistency between how category option IDs are stored (composite `categoryId-optionId` vs plain `optionId`) and how they are read back in the UI.

## What Changes

- **Fix duplicate destination entries**: The `MappingDialog` uses `modelFactory("categoryOptions")` which resolves to `CategoryOptionMappedModel` — a model with a `modelTransform` that explodes each category option into N rows (one per parent category). For the destination picker in global mapping, use plain `CategoryOptionModel` instead to list each category option once.
- **Fix mapping not persisting visually**: `MappingDialog` stores composite IDs as `mappedId` but strips them back to plain IDs with `_.last(split("-"))` when reading, causing a mismatch with the composite row IDs in the table. Ensure consistent ID handling so the previously selected item is correctly highlighted.
- **Fix automap selection invisible**: `AutoMapUseCase` stores plain destination IDs, but the destination table lists composite IDs. The `initialShowOnlySelected` filter then shows zero rows. Align the ID format used by automap with what the table displays.

## Capabilities

### New Capabilities

_(none — this is a bug fix)_

### Modified Capabilities

_(no spec-level requirement changes — the intended mapping behavior was correct by design, only the ID handling is broken)_

## Impact

- **Code**: `src/presentation/react/core/components/mapping-dialog/MappingDialog.tsx` (ID consistency), `src/models/dhis/mapping.ts` (`GlobalCategoryOptionModel`), `src/models/dhis/factory.ts` (model resolution for global mapping context)
- **User impact**: Global category option mapping will show each option once, persist selections visually, and display automap results correctly
- **Risk**: Low — changes are scoped to the mapping UI; the backend mapping consumer (`mapCategoryOptionCombo` in `synchronization.ts`) already handles both composite and plain keys via `_.last(split("-"))`
