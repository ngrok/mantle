---
"@ngrok/mantle": patch
---

`MultiSelect` tags now use a valid ARIA structure. `MultiSelect.TagValues` renders the tags inside a `role="list"` named "Selected values" (set `aria-label` to change it), and each `MultiSelect.Tag` is a `role="listitem"` that marks itself `aria-current="true"` and `data-active` while it has focus. Before this change every tag was a `role="option"` with no listbox around it, and the option role's presentational children flattened the "Remove …" button out of the accessibility tree. `MultiSelect.Trigger` is now `role="presentation"` instead of an unnamed `role="group"`; the input's label names the control.

If you render custom tags through the `MultiSelect.TagValues` render function, give them `role="listitem"`, and query them by that role or by `data-slot="multi-select-tag"` in tests.
