---
"@ngrok/mantle": patch
---

Add `Combobox.ContentFooter`, and move `MultiSelect.ContentFooter` out of the listbox.

A footer holds controls such as a "Show expired" switch, an "Upload certificate" button, or "Load more". It renders at the bottom of the open popover, after the `role="listbox"` element and not in it, because a listbox holds only options and groups. The keyboard contract is the same for both components:

- Tab from the input moves to the footer's first control, and the list stays open.
- Shift+Tab from that control returns to the input.
- Tab from the last control moves to the control after the field and closes the list.
- Escape closes the list and returns focus to the input. A press outside still closes it.
- Arrow keys in the input still move through the options.

`Combobox.Content` and `MultiSelect.Content` now render a popover box around the listbox:

- `className`, `style`, `ref`, the event handlers, and the other `<div>` props go on the popover box, which keeps `data-slot="combobox-content"` or `"multi-select-content"` and gets `data-side`.
- `aria-label` and `aria-labelledby` name the listbox, which has `data-slot="combobox-listbox"` or `"multi-select-listbox"` and scrolls.
- `asChild` swaps the listbox element.

With no footer, Tab from an open `MultiSelect` input now leaves the field and closes the list, as it does in `Combobox`. It did nothing before.

Docs: https://mantle.ngrok.com/components/forms/combobox#with-a-footer
