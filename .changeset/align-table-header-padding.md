---
"@ngrok/mantle": patch
---

`Table.Header` changes from `px-4` to `px-3`, so the column label aligns with the `p-3` body text in `Table.Cell`. Body cells do not move and the row height does not change. A header that sets its own horizontal padding keeps it, because a consumer `className` wins through tailwind-merge.
