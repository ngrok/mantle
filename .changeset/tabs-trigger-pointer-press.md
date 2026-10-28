---
"@ngrok/mantle": patch
---

`Tabs.Trigger`: a mouse press no longer shows the keyboard focus ring. Before, a click after a Tab key press showed the ring on the clicked tab in Chromium, because Radix focuses the trigger from script and Chromium gives that focus the ring state of the element that had focus before. Keyboard focus still shows the ring.

The label text is not selectable (`select-none`), so a selection across the page copies no tab labels.

An `asChild` link trigger now sets `draggable={false}`. Before, a small mouse move on the link started a drag, and the drag cancelled the click, so the tab did not switch. Set `draggable` on the child to drag it.
