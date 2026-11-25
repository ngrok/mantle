---
"@ngrok/mantle": patch
---

`TextArea` grows with its text, and the native `rows` attribute sets its minimum height.

- The field grows as the person types, up to `15rem` (`max-h-60`), then scrolls. Set a `max-h-*` class to change the cap. Browsers without `field-sizing` keep a fixed height and scroll, as before.
- `rows` sets the minimum height in lines, so `rows={1}` and `rows={2}` now give a compact field. Before, a `6rem` minimum height overrode `rows={1}`, `rows={2}`, and `rows={3}`.
- A `TextArea` without `rows` keeps the `6rem` minimum height.
- A drag on the resize handle cannot make the field shorter than its minimum height.
- When the field scrolls, the top or bottom edge fades while it has more text past it. The border and the focus ring stay solid. The new `scroll-fade-y-inset` utility draws the fade.

If you set a small `rows` value and want the old height, remove `rows` or add `className="min-h-24"`. If you want a fixed height that does not grow, add `className="field-sizing-fixed"`.
