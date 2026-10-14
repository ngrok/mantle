---
"@ngrok/mantle": patch
---

`Dialog.Header` now stacks `Dialog.Title` and `Dialog.Description` in a column and keeps every other child, `Dialog.CloseIconButton` included, on the title's row. The header was one unwrapped flex row, so the composition the docs show put the description beside the title and the title shrank to a few characters. A long title still truncates beside the close button, and a description in `Dialog.Body` renders as before.

The stack keys on the `data-slot` of the header's direct children. A wrapper around the title and the description owns their layout, so the `min-w-0 flex-1` wrapper workaround still works.
