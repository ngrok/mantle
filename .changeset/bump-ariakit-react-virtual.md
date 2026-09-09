---
"@ngrok/mantle": patch
---

Bump runtime dependencies: `@ariakit/react` to 0.4.39 and `@tanstack/react-virtual` to 3.14.11.

The ariakit bump changes the DOM of `MultiSelect.Content`, which renders a modal popover by default. A modal popover with no dismiss button renders a visually hidden fallback button so assistive technology users who cannot press Escape or click outside are not trapped. That button used to be the first child of the `listbox` element, where a `listbox` may not own a `button`. It now renders next to the `listbox`, still inside the modal context. The button is still hidden and still not reachable with Tab, so only a CSS selector on the popover's first child or a test that queries for a button inside the `listbox` sees the change.

The ariakit bump also fixes a one-frame stale highlight in `Combobox` and `MultiSelect`: with `autoSelect` on, the previously active option no longer stays highlighted for one frame after the filtered list changes.

The `@tanstack/react-virtual` bump reaches `List.VirtualRoot` and `SelectableList.VirtualViewport`. When a row grows while the list is pinned to the end, the virtualizer re-issues the scroll compensation the browser clamped, so the viewport no longer lands short of the last row.
