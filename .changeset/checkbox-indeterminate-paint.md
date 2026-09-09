---
"@ngrok/mantle": patch
---

`Checkbox` now sets the native `indeterminate` property in a layout effect, before the browser paints. Before this change, a `Checkbox` with `checked="indeterminate"` or `defaultChecked="indeterminate"` could paint one frame as a plain unchecked box on mount, after hydration, or after an async update, and then switch to the indeterminate visual.
