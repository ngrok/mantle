---
"@ngrok/mantle": patch
---

The `Query` JSDoc now names its `keyboardShortcut` prop, which makes the slash key (`/`) focus the field while no other text field has focus. The `Command` JSDoc names its Cmd+K and Ctrl+K chord, and names `Query` as its sibling for a filter on the page. `Command` also gets the `cmd k` and `ctrl k` aliases. `dist/agent.json` carries the new text, so the MCP `find` tool ranks `Query` first for a search field that `/` focuses, and `Command` first for a `⌘K` search.
