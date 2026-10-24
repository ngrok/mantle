---
"@ngrok/mantle": patch
---

Every component and hook in `dist` now ships React Compiler output. Before this release, the compiler skipped `useInertSiblings` and the click handler of `DataTable.ControlCell` and gave no warning, so those two had no memoization. Both now compile. Their behavior does not change.

The mantle build now fails when the compiler cannot compile a function, so a skipped function can no longer reach a release.

What changes for you:

- `useInertSiblings` and `DataTable.ControlCell` get the same memoization as the rest of mantle.
- All other output is the same. A build of this release and a build of the previous source differ in 3 of 257 JavaScript files. Two of the 3 differ only in the file name of a shared chunk.
- You do not need to change your code.
