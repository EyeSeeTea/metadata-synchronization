## ADDED Requirements

### Requirement: Global mapping destination picker SHALL list each category option exactly once

When the user opens the mapping dialog for a category option in the global mapping context, the destination picker MUST display each category option from the destination instance exactly once, using its plain DHIS2 ID.

#### Scenario: Category option belonging to multiple categories appears once
- **WHEN** a category option exists in the destination instance and belongs to 3 different categories
- **THEN** the destination picker SHALL display that category option exactly once, not 3 times

#### Scenario: Destination picker uses plain IDs for global mapping
- **WHEN** the mapping dialog opens for a global category option mapping
- **THEN** each row in the destination picker SHALL use the plain category option ID (not the composite `categoryId-optionId` format)

### Requirement: Selected global category option mapping SHALL be visible when re-opening the dialog

When the user has selected a destination category option in global mapping, re-opening the mapping dialog for the same source element MUST show the previously selected destination item as selected.

#### Scenario: Previously mapped category option is highlighted on dialog re-open
- **WHEN** the user maps source category option A to destination category option B and closes the dialog
- **AND** the user re-opens the mapping dialog for source category option A
- **THEN** destination category option B SHALL be shown as selected in the picker

#### Scenario: "Show only selected" filter displays the mapped item
- **WHEN** the user re-opens a mapping dialog for a category option that was previously mapped
- **AND** the dialog opens with the "show only selected" filter active
- **THEN** the previously mapped destination category option SHALL appear in the filtered list

### Requirement: Automap results for category options SHALL be visible in the mapping dialog

When automap has assigned a destination category option, opening the mapping dialog MUST show that automapped selection.

#### Scenario: Automapped category option is visible in the dialog
- **WHEN** automap has matched source category option A to destination category option B
- **AND** the user opens the mapping dialog for source category option A
- **THEN** destination category option B SHALL be shown as selected in the picker

### Requirement: Nested (non-global) category option mapping SHALL continue using composite IDs

The composite `categoryId-optionId` format used in nested category option mapping (within category combos) MUST remain unchanged.

#### Scenario: Nested mapping still uses composite IDs
- **WHEN** the user maps a category option within a category combo mapping context (non-global)
- **THEN** the destination picker SHALL use composite `categoryId-optionId` IDs as before
