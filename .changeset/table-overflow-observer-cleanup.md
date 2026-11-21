---
"@ngrok/mantle": patch
---

`Table.Root` no longer tracks whether its content is scrolled to the start, which it never used. The React Compiler memoizes its overflow observer, so the observer no longer wraps its result in `useMemo`. Its data attributes and behavior do not change, and the `table` bundle is 23 bytes (gzip) smaller.
