---
"@ngrok/mantle": patch
---

`HoverCard.Root` `openDelay` now defaults to `300` (was `100`), the same delay as `Popover.Trigger` `openOnHover`, so a pointer that passes over a link does not open its card. Pass `openDelay={100}` to keep the old timing.
