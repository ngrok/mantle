---
"@ngrok/mantle": patch
---

Fix `Sidebar.Tooltip` popping a label when the panel collapses, with no pointer anywhere near the row.

The part gated its `Tooltip.Content` on the collapsed rail state but left `Tooltip.Root` to manage its own
open state — and Radix's pointer close path lives *inside* the content, which tracks the pointer leaving the
trigger. With the content withheld, nothing could close it: the pointer crossing an expanded row on its way
to the collapse trigger latched that row's label open, invisibly, and collapsing the panel then mounted every
latched label at once. The app shell demos put the account switcher row right beside the `Sidebar.Trigger`, so
a tooltip appeared on nearly every collapse. The same stale open state pointed the row's `aria-describedby` at
an id that was not in the document and left `data-state="instant-open"` on rows in the expanded panel.

A row wrapped in a menu or dialog trigger latched the same way without any hover: closing the overlay restores
focus to the row, and Radix opens a tooltip on focus. In the shell demos that is the account switcher, which
is why collapsing right after using its menu showed the account's name in the rail.

The rail state is now a veto on a controlled open state rather than a gate on the content, and a rail toggle
resets it, so:

- the expanded panel and the mobile sheet keep every row at `data-state="closed"` with no `aria-describedby`;
- collapsing or expanding dismisses the label instead of replaying a stale one — including the reverse case,
  where a label shown in the rail survived an expand and reappeared on the next collapse;
- the label closes when the pointer leaves the row. `disableHoverableContent` moves that close onto the
  trigger, which is mounted at every rail state, and a rail label has nothing to hover into — per the
  WAI-ARIA tooltip pattern it holds no interactive content.

Opening is unchanged otherwise: the pointer entering a row in the collapsed rail, or focus reaching it, still
shows the label. `Tooltip.Root` still stays mounted at every rail state, so toggling the rail never drops
focus off the row the user was on.
