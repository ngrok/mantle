---
"@ngrok/mantle": patch
---

`Command.Empty` renders nothing in the server HTML and in the hydration pass. cmdk counts matching items in a layout effect, which never runs on the server. Before this change, a server-rendered inline `Command.Root` palette painted "No results found." above its full list until hydration. The message now appears only on the client, and only when no item matches the query. A palette with no items shows its empty state one render after hydration instead of in the server HTML.
