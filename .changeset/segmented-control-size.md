---
"@ngrok/mantle": patch
---

Add a `size` prop to `SegmentedControl.Root`, with `"sm"` and `"md"`. The default is `"md"`, so a control with no `size` renders as before. A `size="sm"` control is 1.75rem (28px) high, the height of a `size="sm"` `IconButton`, or of a `size="sm"` `Button` with any `appearance` except `"link"`, so it lines up with small buttons in a toolbar. Its items get less horizontal padding. The root stamps the size as `data-size`. The items do not accept `size`, so the items of one control always share one height.

See https://mantle.ngrok.com/components/forms/segmented-control#size.
