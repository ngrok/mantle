---
"@ngrok/mantle": patch
---

Every component and hook in `dist` now ships React Compiler output, except the virtualization hook inside `List`. That hook opts out on purpose with `"use no memo"`, because the compiler cannot model `@tanstack/react-virtual`. Before this release, the compiler skipped `useInertSiblings` and the click handler of `DataTable.ControlCell` and gave no warning, so those two had no memoization. Both now compile. Their behavior does not change.

The mantle build now fails when the compiler cannot compile a function, so a function that the compiler skips with no warning can no longer reach a release.

What changes for you:

- `useInertSiblings` and `DataTable.ControlCell` get the same memoization as the rest of mantle.
- You do not need to change your code.
