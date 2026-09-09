---
"@ngrok/mantle": patch
---

`Tabs.Trigger` with `asChild` no longer forces `tabIndex={0}` onto its child. Radix rotates `tabIndex` so only the active tab is a Tab stop, and the forced value put every tab, for example every router link in a list, into the Tab order.

`Tabs.List` no longer scrolls a trigger into view when a pointer press focuses it. It scrolled the pressed tab to the center before the click fired, so an off-center `asChild` link moved out from under the pointer and never navigated. Keyboard focus still scrolls the focused tab to the center.
