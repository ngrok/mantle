---
"@ngrok/mantle": patch
---

Clarify the `@useWhen` tags of `Accordion`, `Alert`, `Badge`, `Choice`, `DataTable`, `SegmentedControl`, `Select`, `Tabs`, and `Toast`, the first JSDoc sentence of `Toast`, and the aliases of `Alert` and `RadioGroup`. `dist/agent.json` carries the new text, so an agent that searches for "inline alert", "radio cards", "error toast", "expiry duration", or "custom tab markup" finds the correct part.
