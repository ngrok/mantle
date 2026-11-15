---
"@ngrok/mantle": patch
---

The published files keep the `"use client"` directive. Each `dist` chunk that holds a client component or hook now starts with `"use client"`, so a React Server Components host treats mantle components as client components. A compound component such as `Popover` is one object, and a server component cannot read a part of a client object, such as `Popover.Root`. Render compound components from a client component.

Chunks with no client code stay free of the directive, so server code can call them: `@ngrok/mantle/cx`, `@ngrok/mantle/utils`, `@ngrok/mantle/types`, `@ngrok/mantle/color`, and `canUseDOM` from `@ngrok/mantle/browser-only`.
