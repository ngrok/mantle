# SegmentedControl is its own component, on the radio primitive

**Date:** 2026-11-13
**Status:** Accepted
**Contests:** [COMPONENT_SPEC.md §1.1](../COMPONENT_SPEC.md#11-one-component-per-user-intent), which says a variant of an intent that an existing component answers is a part or a prop, not a new component.

## Context

`RadioGroup` shipped a segmented control as two parts: `RadioGroup.ButtonGroup`, which replaced `RadioGroup.Root`, and `RadioGroup.Button`. The docs page listed "segmented control" only as an alias. The docs-site MCP feed showed people and agents searching for "segmented control", and the `find` tool ranked `RadioGroup` for it only through that alias. The two parts also shared none of the family's other parts: `Indicator`, `ItemContent`, `InputSandbox`, `List`, and `Card` do not apply to a row of segments.

## Decision

1. **A new top-level component, `SegmentedControl`, with `Root` and `Item`.** Its intent is to switch a view or a mode in one row, where the change usually takes effect at once. `RadioGroup` stays the form field whose options can carry a description or stack in a column. `Tabs` stays the control whose options each show a panel. "Trigger" is not a part name: in mantle and Radix it names a control that opens something.
2. **One radio primitive under both.** `radio-group/primitive.tsx` holds the Headless UI root, the item, the item state context, and the ARIA wiring for `Field.Control` and `Choice`, like `dialog/primitive.tsx` under `Dialog` and `Sheet`. The two components keep the same roles, keyboard, and form contract, and a fix to the wiring reaches both.
3. **The thumb moves in JavaScript.** `useSegmentedThumb` slides the thumb with the Web Animations API on every change, because only Chromium animates a jump of `left: anchor(left)`. It also drags the thumb with a mouse or a finger, with no dependency.
4. **The bump is `minor`.** `RadioGroup.ButtonGroup` and `RadioGroup.Button` are gone. The guide at `/migrations/0015-segmented-control-migration` and its codemod carry the rename.

## Consequences

- A dry run of the codemod over the frontend apps rewrote 177 of 178 references in 23 files. The one left is a code comment.
- The `data-slot` values change, from `radio-group-button-group` to `segmented-control` and from `radio-group-button` to `segmented-control-item`. A selector on them is a manual step in the guide.
