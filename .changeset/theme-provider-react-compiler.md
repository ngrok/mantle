---
"@ngrok/mantle": patch
---

`ThemeProvider` now compiles under the React Compiler. Its effect cleanup held optional chaining inside a `try` block. The compiler cannot lower that shape, so it skipped the whole component. The cleanup now calls a module function that owns the `try`. Behavior is unchanged: the cross-tab `BroadcastChannel` still closes on unmount, and a `close()` that throws is still swallowed.
