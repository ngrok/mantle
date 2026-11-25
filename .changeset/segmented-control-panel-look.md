---
"@ngrok/mantle": patch
---

`SegmentedControl` now looks like a `ButtonGroup` panel of ghost `IconButton`s. The track has a border, the form background, and the `rounded-md` corner of a button. The thumb is a flat neutral tint with no shadow, and it takes the fill of a pressed ghost button. The thumb is the only fill. A segment that is not checked has `text-muted`, and it turns `text-strong` on hover. The checked segment has `text-strong`. An icon takes the same color. Labels are `font-medium`, as on a `Button`.

At every size, the thumb sits 4px inside the track and has a 2px corner. The control is still as high as a `Button` of the same `size`. At `xs` and `sm`, the segments are 4px shorter than before (16px and 20px), and the labels have a shorter line, so they keep 2px above and below.

A segment whose children are an `svg` and `sr-only` text is now square at every size, like an `IconButton`. Wrap a visible label beside an icon in an element, such as a `<span>`. At `xs` and `sm`, a text segment is at least 24px wide, so one-character targets stay 24px apart.

Docs: https://mantle.ngrok.com/components/forms/segmented-control
