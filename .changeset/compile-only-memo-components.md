---
"@ngrok/mantle": patch
---

The React Compiler now compiles a component only when memoization can help it: when the component calls a hook or creates a function in render. About 240 components and parts that do neither, such as `Button`, `Card`, `Dialog.Header`, and `Table.Row`, now ship as written, without a memo cache. They render the same HTML and behave the same.

Each entry is up to 2.0 KB (gzip) smaller. For example, `Button` is 1.6 KB smaller, `Dialog` 1.5 KB, `Alert` 1.9 KB, and `Card` 0.3 KB. All of mantle's JavaScript is 17.0 KB (gzip, 7.0%) smaller.

A file with no compiled component and no `"use client"`, such as `Card` or `MediaObject`, now builds to a chunk with no `"use client"`, so a server component can render it.
