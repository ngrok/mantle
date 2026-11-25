---
"@ngrok/mantle": patch
---

Add `useCodeBlockStream`, which highlights code in the browser as it streams, for a `CodeBlock` whose code is not known on the server. It tokenizes in a worker, and only the lines that changed since the last update. A grammar loads only when a block uses its language.
