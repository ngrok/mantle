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

`Combobox.Content` and `MultiSelect.Content` stay the `role="listbox"` element, with their props, `ref`, `className`, and `asChild`. A popover box around the listbox now holds the footer, with `data-slot="combobox-popup"` or `"multi-select-popup"`, and carries `data-side` and the border and shadow. A footer control that turns disabled or unmounts while it has focus returns focus to the input. A press outside a `Combobox` now closes its list even when focus is in the footer.

With no footer, Tab from an open `MultiSelect` input now leaves the field and closes the list, as it does in `Combobox`. It did nothing before.

Docs: https://mantle.ngrok.com/components/forms/combobox#with-a-footer
