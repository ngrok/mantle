---
"@ngrok/mantle": patch
---

The React Compiler now compiles `useInertSiblings` and the click handler of `DataTable.ControlCell`. Before this release, the compiler skipped them, so they had no memoization. The build now fails when the compiler cannot compile a function, so every component and hook in `dist` ships compiled. Behavior does not change.
