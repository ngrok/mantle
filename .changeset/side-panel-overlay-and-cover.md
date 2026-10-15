---
"@ngrok/mantle": patch
---

`AppLayout.SidePanel` can now be swiped away in every presentation, a floating one is an overlay the reader can dismiss, and a covering one is modal.

- **`AppLayout.SidePanelHeader` is a swipe handle**, through the new `useSwipeToDismiss` hook. A drag toward the end edge follows the pointer one to one: a floating panel slides, and a panel in the lane shrinks the way its close animation does, so the page grows under the finger. A release past 25% of the panel's width, or a flick, closes it. A shorter drag springs back on the panel's own 200ms ease-out, so `motion-reduce:` turns it into a cut, and a drag the wrong way meets rubber-band resistance. The row is `touch-pan-y`, so a vertical swipe still scrolls, and a tap on a control in the row stays a tap.
- **`Escape` closes a floating panel** while focus is inside it. An open combobox or popover inside the panel takes the first `Escape`, and the next one closes the panel. The root then returns focus to the trigger outside, as on every close. A panel in the lane is a docked pane and ignores `Escape`.
- **A covering panel is modal.** When the panel covers the row from gutter to gutter (one breakpoint below `mobileBreakpoint`), the row's other children, the card and the rail, go `inert` while it is open, and a focus trap wraps `Tab` inside it and moves focus into it on open. The one `<aside>` stays mounted across the lane, the float, and the cover, so a conversation keeps its DOM and the trap turns on and off with the viewport. The `complementary` landmark keeps its name.
