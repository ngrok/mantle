---
"@ngrok/mantle": patch
---

Fix `Drawer` and `Popover` drawer gestures, focus, and names:

- A drag up stretches the `Drawer` panel, which stays on the bottom edge, and no longer lifts it off the edge.
- A press on a menu trigger in a `Drawer` header opens the menu and lets the drag pick an item. It no longer moves or closes the drawer.
- `useSwipeToDismiss` ends a drag when a control in the handle stops its `pointerup`, so a later mouse move no longer drags the target.
- A `Drawer` that a controlled owner reopens during its exit slides back from where it is. It no longer jumps to the bottom edge to start again.
- A `Popover` drawer that opens inside a `Dialog` keeps its trigger as its name.
- A `Popover` with `presentation="auto"` that its owner opens under another open overlay opens as a popover, which stays hidden until that overlay closes. It no longer opens a second modal that takes focus.
- A `Sandbar` also slides away under a drawer that opens from a popover in the bar. Its controls leave the Tab order there, also a child with `visibility: visible`.
