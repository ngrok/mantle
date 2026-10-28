---
"@ngrok/mantle": patch
---

`Tabs.Trigger`: a mouse press no longer shows the keyboard focus ring. Before, a click after a Tab key press showed the ring on the clicked tab in Chromium, because Radix focuses the trigger from script and Chromium gives that focus the ring state of the element that had focus before. Keyboard focus still shows the ring.

The label text is not selectable (`select-none`), so a selection across the page copies no tab labels.

An `asChild` link trigger now activates on click, not on the press. Before, a press released off the link switched the tab but followed no link, so the panel and the URL disagreed. The link also no longer starts a drag on a small mouse move, which cancelled the click.
