---
"@ngrok/mantle": patch
---

A closed `Select`, `Combobox`, or `MultiSelect` costs less on the page. A page with many pickers loads, hydrates, and holds less memory.

- A closed `Select.Content`, `Combobox.Content`, or `MultiSelect.Content` mounts nothing. The popup, its portal host, and the list store start when the list opens, so the pickers add no second commit to hydration.
- `Select.Trigger` and `Combobox.Input` no longer subscribe to the list. The open list sets their `aria-activedescendant` and removes it when the list closes. A move of the highlight re-renders only the two options that change.
- `Select.Value` subscribes to the list only when it cannot find the selected item's text among the `Select.Item` elements.
- The select caret, the item check, and the tag remove and lock icons render as one `<svg>` each. They keep `data-slot="icon svg-only"`, `aria-hidden`, and their size and color classes.
- The class lists of the three `Content` parts fold at build time, so an open runs no class merge.
