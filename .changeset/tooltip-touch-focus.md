---
"@ngrok/mantle": patch
---

A tap on a `Tooltip.Trigger` no longer opens its tooltip on the focus that the tap causes. A tap focuses the trigger after `pointerup`, so the tooltip opened there and the tap's click closed it again in the same frame. A keyboard focus still opens the tooltip, also after a touch press that becomes a scroll. On a phone at 4× CPU slowdown, this takes about 40 ms off the tap that opens the mobile `Sidebar` sheet.
