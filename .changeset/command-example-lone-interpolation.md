---
"@ngrok/mantle": patch
---

The `@example` on `useCommandDialog` no longer teaches a shape that crashes a translated page. It rendered `Search everything for “{query}”` as three children of a `Command.Item`, and `Command.DialogRoot` resets the query on every open, so React removed the middle text node between two literal siblings. A browser translation engine reparents that node first, so the removal threw `NotFoundError` and blanked the page. The example is one template literal now, which makes the interpolation a lone child React writes through `textContent`.
