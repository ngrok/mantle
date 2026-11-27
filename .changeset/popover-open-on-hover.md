---
"@ngrok/mantle": patch
---

Add `openOnHover` to `Popover.Trigger`. A mouse or pen that rests on the trigger for 300ms opens the popover, and a tap, `Enter`, or `Space` still open it, so an info icon works on touch screens too. A hover open does not move focus. It stays open while the pointer moves onto the content, and it closes when the pointer leaves both or on `Escape`. A press on the trigger, or a press or focus in the content, keeps it open as a normal open, and a press on the trigger moves focus into the content. With `presentation="auto"`, a hover never opens the drawer. Without the prop, nothing changes.
