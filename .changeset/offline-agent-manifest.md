---
"@ngrok/mantle": patch
---

`dist/agent.json` now carries the full agent manifest: every component with its import path, status, summary, JSDoc summary, `@example` blocks, search aliases, and sibling boundaries, plus the hooks and utilities with their examples. `dist/llms.txt` lists every module on one line with its import path and summary. Both match what `https://mantle.ngrok.com/api/components.json` serves, so an agent with no network reads the same records from `node_modules`.

Card, Well, Separator, and Empty now state their sibling boundaries in `@useWhen` and `@siblings` JSDoc tags. The manifest exposes them as `useWhen` and `siblings`, and the docs pages carry a matching "When to use" section.
