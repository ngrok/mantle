---
"@ngrok/mantle": patch
---

When `type`, `value`, and the set of open sections are unchanged, `Accordion.Root` now keeps its context identity across parent renders. Before this change, every parent render rebuilt the context, so:

- every `Accordion.Item` recomputed its state,
- every `Accordion.Content` removed and re-added its `beforematch` listener, and
- a `memo()` wrapper around an item never skipped a render.

The accordion still calls the latest `onValueChange` you pass.
