---
"@ngrok/mantle": patch
---

`Table.Cell` changes from `p-3` to `px-4 py-3`, so the body text aligns with the `px-4` column label in `Table.Header`. The row height does not change. A cell that sets its own horizontal padding keeps it, because a consumer `className` wins through tailwind-merge.
