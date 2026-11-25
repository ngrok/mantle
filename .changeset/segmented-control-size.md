---
"@ngrok/mantle": patch
---

Add a `size` prop to `SegmentedControl.Root`, on the button family's scale: `"xs"`, `"sm"`, `"md"`, `"lg"`, and `"xl"`. The default is `"md"`, so a control with no `size` renders as before. Each size is as high as an `IconButton` of the same size, or a `Button` with any `appearance` except `"link"` (24px, 28px, 36px, 40px, and 48px), so a control lines up with buttons of the same size in a toolbar. The items get the horizontal padding of a text-only `Button` of the same size. At `"xs"`, the labels are `text-xs`, so they have room inside the 20px thumb. The root stamps the size as `data-size`. The items do not accept `size`, so the items of one control always share one height.

See https://mantle.ngrok.com/components/forms/segmented-control#size.
