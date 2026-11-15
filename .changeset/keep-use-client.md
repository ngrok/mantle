---
"@ngrok/mantle": patch
---

The published files keep the `"use client"` directive. Each `dist` chunk that holds a client component or hook now starts with `"use client"`, so a React Server Components host treats mantle parts as client components. Chunks with no client code, such as `@ngrok/mantle/cx`, `@ngrok/mantle/utils`, `@ngrok/mantle/types`, and `@ngrok/mantle/color`, stay free of the directive, so server code can call them.
