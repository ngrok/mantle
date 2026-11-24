---
"@ngrok/mantle": patch
---

`TextArea`: the native `rows` attribute now sets the height of the field. Before, a `6rem` minimum height overrode `rows={1}`, `rows={2}`, and `rows={3}`. A `TextArea` without `rows` keeps the `6rem` minimum height and looks the same. If you set a small `rows` value and want the old height, remove `rows` or add `className="min-h-24"`.
