---
"@ngrok/mantle": patch
---

Ship React Compiler output in the published package. Components and hooks come precompiled with automatic memoization, so consumers get the render-performance win without running the compiler themselves. React 19, which the package already requires, carries the `react/compiler-runtime` import the compiled code uses. `DataTable` and the virtualized list core opt out with `"use no memo"`, because TanStack Table and TanStack Virtual expose mutable instances the compiler cannot memoize safely.
