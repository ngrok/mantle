---
"@ngrok/mantle": patch
---

The chart `Root`, the tooltip surface, and `CopyButton` no longer use three patterns the React Compiler rejects: a ref written through the context state object, a consumer ref written directly inside an effect, and optional calls inside a `try` block. Behavior does not change. A consumer `ref` on a `Tooltip` part still receives the tooltip element, honors a callback ref's cleanup, and resets an object ref to `null` on unmount.
