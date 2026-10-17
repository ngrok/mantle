---
"@ngrok/mantle-server-syntax-highlighter": patch
---

Remove unsafe type casts from the fold-range parsers and the LRU cache. Behavior is the same; a cached `undefined` value still reads as a hit.
