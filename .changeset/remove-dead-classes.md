---
"@ngrok/mantle": patch
---

Remove nine class names that emit no CSS from `Button`, `Calendar`, `DropdownMenu`, `Popover`, and `TextArea`. The rendered styles do not change. The `class` attributes of these parts are shorter. `Calendar` no longer puts the `day`, `day-outside`, and `day-range-middle` marker classes on its cells, because no mantle style reads them; `day-range-start` and `day-range-end` stay.
