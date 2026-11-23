---
"@ngrok/mantle": minor
---

`Command` no longer uses `cmdk`. The `useListbox` hook that drives `Select`, `Combobox`, and `MultiSelect` now drives the palette too, and a query filters in one pass over the DOM: it writes `hidden` on each item and group that does not match and moves the matches into score order, so no item re-renders on a keystroke. The parts, their props, the `command-score` ranking, the keyboard, `useCommandState`, and the accessibility tree stay the same.

Measured on an inline palette of 2,000 items in Chromium 159 at 4× CPU slowdown, against `cmdk` (median of 5 rounds): hydration 478 → 155 ms, mount 637 → 328 ms, the slowest keystroke 272 → 136 ms, and the heap after a typing session 14.9 → 4.9 MB. An inline palette (`Command.Root` with no dialog) drops from 25.0 KB to 13.4 KB gzip, because `cmdk` imported Radix Dialog for its own `Command.Dialog`. A dialog palette is 0.4 KB larger (29.6 → 30.0 KB) until `Dialog` moves off Radix.

Breaking changes. Follow the [migration guide](https://mantle.ngrok.com/migrations/0024-command-owned-behavior-migration); `pnpm -w run migrate 0024` rewrites `[cmdk-*]` selectors in class strings.

- The parts no longer render the `cmdk-*` attributes. Select a part by its `data-slot`: `command`, `command-input`, `command-list`, `command-group`, `command-group-heading`, `command-group-items`, `command-item`, `command-separator`, and `command-empty`. `--cmdk-list-height` is gone.
- An item that the query does not match stays mounted with the `hidden` attribute, so it keeps its state. A test that asserts a filtered item with `queryByText` now finds it; use `queryByRole("option", { name })`.
- A group with a better match now moves above the other groups during a search, as `cmdk` documents. `cmdk` never moved its groups.
- `Command.Root`, `Command.List`, and `Command.Group` no longer take `asChild`, which threw at runtime with `cmdk`.
- `Command.Item` has `data-disabled="true"` only when it is disabled, and `data-selected="true"` only while it is active. It no longer renders the `"false"` values.

Other changes:

- An empty query puts the items back in the order they had before the search, and an item appended during the search stays at the end. With `cmdk`, the order after a search stayed shuffled.
- Items with the same score keep their first order.
- The empty state shows when the last item unmounts, and an item that mounts during a query is filtered against it.
- `Command.List` scrolls with no visible scrollbar, fades its edges where more items are past them, and does not bounce or scroll the page at its end.
- A press inside `Command.List` keeps focus in `Command.Input`.
- `Command.Root`'s `label` sets the input's `aria-label`, in place of a hidden `<label>` element.
