---
"@ngrok/mantle": patch
---

`TruncatedText` stands down inside a control. While its value overflowed, the root became a tab stop and a tooltip trigger wherever it rendered, so a value inside a `<button>`, an `<a href>`, an `Accordion.Trigger`, a `RadioGroup` item, a menu item, or a tab nested a second focusable element in the control, which is invalid HTML and a second Tab stop for the same thing.

Inside a control the root now takes no `tabIndex` and renders no tooltip, so it stamps no `data-state`. The segments still clip, `data-truncated` still lands, and the visually hidden copy still gives the control's accessible name the whole value. A `tabIndex` prop still wins. Wrap the control in `Tooltip` when a sighted reader needs the full value; the root no longer stops that tooltip from opening while its value fits. The server render and the first client render assume no control, like they assume no overflow. After that, every commit checks again from the root's parent, so a root that `asChild` renders as a control is not inside one, and a control that gains or loses its `href` or role around a mounted root takes effect without a remount.

Docs: https://mantle.ngrok.com/components/data-display/truncated-text#accessibility
