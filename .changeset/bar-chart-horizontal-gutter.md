---
"@ngrok/mantle": patch
---

`BarChart` with `orientation="horizontal"` sizes its category gutter from the category names on the first layout. Before, the first layout measured index ticks, so with `animate={false}`, `mode="static"`, or reduced motion the gutter was as wide as the label `0` and the category names were clipped until the data or the size changed.
