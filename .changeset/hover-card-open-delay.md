---
"@ngrok/mantle": patch
---

`HoverCard.Root` `openDelay` now defaults to `700` (was `100`), so a pointer that passes over a link does not open its card. `closeDelay` stays `300`. Pass `openDelay={100}` to keep the old timing.
