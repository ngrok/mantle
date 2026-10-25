---
"@ngrok/mantle": patch
---

`isApplePlatform` returns `false` during a server render. Before this release, it read the `navigator` global, which Node 21 and later also define, so a server on macOS could report an Apple platform and the client could then hydrate a different shortcut hint.

The source now passes the stricter lint rules that the ngrok frontend repo uses. The other changes are internal and do not change behavior.
