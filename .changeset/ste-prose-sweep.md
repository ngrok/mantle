---
"@ngrok/mantle": patch
---

Rewrote comments and JSDoc across the library against the new `CONVENTIONS.md § Writing` standard. This is a
prose change: no component behavior, API, prop, type, or class name moves.

Six JSDoc blocks were wrong before this pass, so their published text changes meaning:

- **`Select.Value`** no longer claims the trigger positions it. Radix measures the value element's own box to
  align the open content over the selected item.
- **`Table.Root`** documents the `data-x-overflow`, `data-x-scroll-end`, and `data-sticky-active` attributes it
  stamps. The old summary called them "additional functionality".
- **`Select.Item`** points at `onValueChange` instead of the deprecated `onChange`.
- **`Combobox.Item`** says that `value` and `userValue` override the defaults only when you pass them.
- **`TooltipProvider`** restores the one-instance rule: a second provider gives part of the tree a different
  delay.
- **`useBreakpoint`** and **`useIsBelowBreakpoint`** state what they return — the largest matching Tailwind
  breakpoint, or `"default"` below `2xs` — rather than narrating `useSyncExternalStore`.

Several summaries that restated their own identifier now name what the part does that a sibling does not.
`Card.Header`, `Card.Footer`, `Card.Title`, `Command.Root`, `Command.Input`, `Combobox.Root`,
`MultiSelect.Root`, `Tabs.Root`, `Tabs.Badge`, `AlertDialog.Portal`, `Sheet.Portal`, `Input.Root`,
`Table.Root`, and `Theme` are the visible ones, and each docs-page copy moved with them.
