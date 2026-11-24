---
"@ngrok/mantle": patch
---

The `Query` JSDoc now names its `keyboardShortcut` prop, which makes the slash key (`/`) focus the field. The `Command` JSDoc names `Query` as its sibling for a filter field on the page, and `Command` gets the `cmd k` and `ctrl k` aliases. `dist/agent.json` carries the new text, so the MCP `find` tool ranks `Query` first for a search field that `/` focuses, and `Command` first for a `⌘K` search.
