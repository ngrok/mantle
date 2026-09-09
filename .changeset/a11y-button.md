---
"@ngrok/mantle": patch
---

Make a disabled or loading `Button` and `IconButton` inert under `asChild`. The native `disabled` attribute does nothing on an `<a>`, so before this change a disabled `asChild` link announced `aria-disabled="true"` but stayed in the tab order and still navigated on click. The child now gets no `disabled` attribute; it gets `aria-disabled="true"`, `tabIndex={-1}`, and a click on it is cancelled before its own handler or a router runs. The dimmed styling applies through `aria-disabled` as well as `disabled`. Pointer events stay on, so a `Tooltip` that explains why the button is disabled still opens on hover.

`disabled` and `isLoading` now always win: `aria-disabled={false}` can no longer re-enable a button the caller disabled.

The JSDoc and the docs pages now list every data attribute both buttons emit (`data-appearance`, `data-intent`, `data-size`, `data-loading`, `data-disabled`, and `data-icon-button`), name `isLoading` where they once named a `state` prop that never existed, and document `ButtonGroup`.
