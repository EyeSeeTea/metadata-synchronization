# Cross-type selection notification — design

Date: 2026-06-04
Branch: `fix/select-all-notification-cross-type`

## Context

`MetadataTable` lets a user pick metadata across several types (Data Elements,
Categories, Constants, …) from a single table whose active type is chosen via a
dropdown. Since PR #1048, the selection handed to the table is a **flat, merged
list across all types** (`syncRule.metadataIds`), with no per-id type
information.

That merge caused a regression in the d2-ui select-all banner: d2-ui compares
`selection.length === total`, but `selection` carried other-type ids (e.g. 222)
while `total` was only the current type's count (e.g. 221), so the "All N
selected" banner never resolved. The first fix scopes the selection passed to
d2-ui down to the current type so the banner counts correctly.

Scoping fixes the banner but hides a real fact from the user: **items of other
metadata types are still selected**, invisible in the current table. The d2-ui
"selected in other pages" message is about pagination _within one type_, not
other types, so it cannot express this. This change surfaces that fact.

## Goal

When the current table's selection coexists with selections in other metadata
types, show an **informational** banner line making the user aware of it. No
clickable action (the select-all "Clear" already wipes everything per the
clear-all fix).

Message (fixed string):

```
Some items are also selected in other metadata types.
```

Rendered alongside the existing d2-ui selection messages:

```
All 221 Data Elements are selected. Clear
Some items are also selected in other metadata types.
```

## Approach

### Detection — one boolean: `hasCrossTypeSelection`

We do **not** need per-type counts or labels — only whether the selection
contains anything outside the current type. Two paths feed the boolean:

1. **Normal types** (current type's id list `ids` is loaded, `ids.length > 0`):
   cheap set difference, **no API call**:

    ```ts
    const idsSet = new Set(ids);
    const hasCrossTypeSelection = selectedIds.some(id => !idsSet.has(id));
    ```

2. **organisationUnits** (`ids` is never populated — the existing effect at
   `MetadataTable.tsx:517` returns early for org units): one
   `compositionRoot.metadata.getByIds.execute(selectedIds, remoteInstance, { id: true })`
   call. The result is a `MetadataPackage` keyed by collection name; cross-type
   is true if any collection key other than `"organisationUnits"` has items.

This removes the org-units limitation that a subtraction-only approach would
have, while keeping the common path API-free.

### Wiring the notification

-   Build `crossTypeNotifications: TableNotification[]` — `[]` when
    `hasCrossTypeSelection` is false, otherwise a single
    `{ message }` (no `link`, no `newSelection`).
-   Pass via the existing `tableNotifications` prop on `ObjectsTable`.
    `ObjectsTableProps extends DataTableProps`, which already declares
    `tableNotifications?: TableNotification[]`; `ObjectsTable` forwards it through
    `rest` to `DataTable`, which renders `[...tableNotifications, ...selectionMessages]` in the same banner area.
-   No current parent passes `tableNotifications`, but to be safe, merge any
    inherited `rest.tableNotifications` with the generated ones rather than
    letting `{...rest}` override.

### State / effect

-   `const [crossTypeSelected, setCrossTypeSelected] = useState(false)`.
-   Path 1 (sync, no API): when `ids.length > 0`, derive the boolean directly
    during render (no state needed for this path).
-   Path 2 (org units, async): an effect keyed on a **stable hash of
    `selectedIds`** (sorted join) that runs only for the org-units model, calls
    `getByIds`, and sets `crossTypeSelected`. Keying on the hash avoids refetching
    when unrelated re-renders occur.

A single `hasCrossTypeSelection` value combines the sync result (path 1) and the
async state (path 2) depending on whether `ids` is loaded.

## Files

-   `src/presentation/react/core/components/metadata-table/MetadataTable.tsx`
    -   Keep the existing selection-scoping (`scopedSelectedIds`) that fixes the
        banner count.
    -   Add the org-units detection effect + state.
    -   Compute `hasCrossTypeSelection` and `crossTypeNotifications`.
    -   Pass `tableNotifications` into `ObjectsTable`.
-   `src/presentation/react/core/components/metadata-table/selection.ts` (new on
    this branch) — pure, unit-testable helpers:
    -   `hasOtherTypeIds(selectedIds: string[], currentTypeIds: string[]): boolean`
    -   `packageHasOtherType(pkg: MetadataPackage, currentCollection: string): boolean`
    -   `getCrossTypeNotifications(show: boolean): TableNotification[]` (or inline if
        trivial)
-   `src/presentation/react/core/components/metadata-table/__tests__/selection.spec.ts`
    (new) — cover the pure helpers.

## Testing

### Unit (vitest)

-   `hasOtherTypeIds`: returns true when a selected id is absent from
    `currentTypeIds`; false when all selected ids belong to the current type;
    false for empty selection.
-   `packageHasOtherType`: true when the package has a collection key other than
    the current one with items; false when only the current collection (or empty)
    is present.

### Manual (against a DHIS2 instance — see `run` skill)

1. Open a sync rule's metadata step.
2. Select items in **Data Elements**, switch to **Categories**, select items
   there.
3. Switch back to **Data Elements**: the "All N selected" banner resolves
   correctly **and** the new line "Some items are also selected in other
   metadata types." appears.
4. Switch the dropdown to **Organisation Units** while other types are selected:
   confirm the cross-type line still appears (covers the async/org-units path).
5. Clear the selection: confirm the line disappears.

## Out of scope / known trade-offs

-   No per-type breakdown or counts (intentional — see brainstorming decision).
-   No "clear others" link (informational only).
