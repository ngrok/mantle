---
"@ngrok/mantle": patch
---

`dist/agent.json` now has a `recipes` list. Each recipe has its `name`, `slug`, `docsUrl`, `markdownUrl`, `summary`, `useWhen`, `aliases`, and the `parts` it composes. These are the same recipe records that the mantle MCP server's `find` and `get` tools serve, so an agent with no MCP connection finds the same recipes. `dist/llms.txt` lists each recipe on one line with its parts.
