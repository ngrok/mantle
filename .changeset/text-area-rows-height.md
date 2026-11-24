---
"@ngrok/mantle": patch
---

`TextArea`: the native `rows` attribute now sets the height of the field. Before, a `6rem` minimum height overrode `rows={1}`, `rows={2}`, and `rows={3}`. A `TextArea` without `rows` keeps the `6rem` minimum height and looks the same. If you set a small `rows` value and want the old height, remove `rows` or add `className="min-h-24"`. With `field-sizing-content`, supporting browsers ignore `rows` of any size, so an empty field shrinks to one line. To keep the old minimum there, add `min-h-24`.
