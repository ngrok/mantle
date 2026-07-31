---
"@ngrok/mantle": patch
---

Rewrote comments and JSDoc across the library against the new `CONVENTIONS.md § Writing` standard. This is a
prose change: no component behavior, API, prop, type, or class name moves. The rewritten JSDoc ships in the
published `.d.ts`, so consumers see it in editor tooltips.

Seven JSDoc blocks were wrong before this pass, so their published text changes meaning:

- **`Select.Value`** now names the case where the styling restriction bites: under
  `Select.Content position="item-aligned"`, Radix measures this element's box to align the open list over the
  selected item. The old text gave the instruction with no reason.
- **`Table.Root`** names what it does — it draws the border and rounded corners, and scrolls wide content
  horizontally with a fading scroll edge. The old summary called that "additional functionality".
- **`Select.Item`** points at `onValueChange` instead of the deprecated `onChange`.
- **`Combobox.ItemValue`** says that `value` and `userValue` override the defaults only when you pass them.
- **`TooltipProvider`** restores the one-instance rule: a second provider gives part of the tree a different
  delay.
- **`useBreakpoint`** states what it returns — the largest matching Tailwind breakpoint, or `"default"` below
  `2xs` — rather than narrating `useSyncExternalStore`.
- **`useIsBelowBreakpoint`** states what it returns: `true` while the viewport is narrower than the given
  breakpoint.

Several summaries that restated their own identifier now name what the part does that a sibling does not.
`Card.Header`, `Card.Footer`, `Card.Title`, `Command.Root`, `Command.Input`, `Command.List`, `Command.Empty`,
`Command.Group`, `Command.Item`, `Combobox.Root`, `MultiSelect.Root`, `Tabs.Root`, `Tabs.Badge`,
`AlertDialog.Root`, `Table.Root`, and `Theme` are the visible ones, and each docs-page copy moved with them.

`Tabs.Root` and `Combobox.Root` state what they own rather than which parts read it. The earlier wording named
the parts that read the context, which under-reported the reach: `Tabs.Content` carries `data-orientation`
through Radix's own context, and `Combobox.ItemValue` and `Combobox.Group` read the ariakit store through
ariakit. `Tabs.Root` now names the `data-orientation` and `data-appearance` attributes it stamps, which any
descendant can select against.

Four summaries no longer read as a copy of a sibling's:

- **`IconButton`** leads with what makes it an icon button — one icon and nothing else, with the required
  `label` prop carrying the accessible name. It opened with `Button`'s three sentences verbatim.
- **`Switch`** names its difference from `Checkbox`: no indeterminate state. The two shared one sentence.
- **`Icons`**, **`Pagination`**, and **`Theme`** say what their module exports. Each published only
  "Re-exports for the … component."
- **`Alert.Icon`** was missing a verb, and its three copies disagreed three ways.
