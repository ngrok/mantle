---
"@ngrok/mantle": patch
---

`CodeBlock.CopyButton` now compiles under the React Compiler. Its click handler no longer calls `onClick` and `onCopy` with `?.()` inside the `try` block. The compiler cannot lower that shape, so it left the whole component uncompiled. `CopyButton` now gets the same compiler memoization as its siblings. Nothing changes at runtime: `onClick`, `onCopy`, and `onCopyError` fire as before.
