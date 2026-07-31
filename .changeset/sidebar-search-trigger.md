---
"@ngrok/mantle": minor
---

**`Sidebar.SearchTrigger`: the sidebar's search row.**

A new part for the top of `Sidebar.Body` (or `Sidebar.Header`, under the switcher) — the row that opens a search or command palette.

It is deliberately a navigation row and not a text field. The chrome is a `Sidebar.ItemButton`'s, down to the 28px chip it becomes in the collapsed icon rail, because a search entry point in a sidebar is one of the rows rather than a form control wedged among them. `Sidebar.ItemButton` and `Sidebar.SearchTrigger` now share one row-chrome constant instead of repeating it, because "these are the same row" is the contract: a search row whose geometry drifts from the navigation rows below it reads as a foreign control.

Its `shortcut` prop takes the keyboard hint — usually `<><MetaKey /><Kbd>K</Kbd></>` — and reveals it only on hover or keyboard focus, so the resting panel stays quiet. The hint is `aria-hidden` (the `aria-keyshortcuts` that `Command.SearchTrigger` adds announces the chord) and dropped outright in the rail, where the row's label is clipped rather than removed so the button keeps its accessible name as a chip. `shortcut` and `asChild` are mutually exclusive in the type: the hint is a sibling this part renders, and a slotted child is cloned rather than wrapped, so there is nowhere to put one.

The row is styling only — it is not wired to any state. Compose it with [`Command.SearchTrigger`](https://mantle.ngrok.com/components/navigation/command#commandsearchtrigger) for the dialog wiring and the typing behavior, and with `Sidebar.Tooltip` so the row keeps a visible label in the rail.

`Sidebar.Tooltip` also gained a `shortcut` prop, which renders the chord after the label. The rail hides a row's own hint along with its text, so the tooltip is where a pointer user can still learn it.

`Sidebar.Header` is a fixed height so it can align with an `AppLayout.Header` toolbar, and that height is sized for one row. If you stack the switcher and the search row there, raise `--sidebar-header-height` on a **common ancestor of both rows** — `<AppLayout.Root className="[--sidebar-header-height:6rem]">`. Setting it on `Sidebar.Nav` only looks right: custom properties inherit downward, so `AppLayout.Header` would keep the `4.5rem` default and the two rows would stop being center-aligned.

Docs: https://mantle.ngrok.com/components/navigation/sidebar#sidebarsearchtrigger
