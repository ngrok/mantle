---
"@ngrok/mantle-vite-plugins": patch
---

Scan the `skeleton` chunk for `breadcrumb` consumers. `Breadcrumb.Skeleton` renders the `Skeleton` block, whose class strings are hoisted into `skeleton-<hash>.js`, so a breadcrumb-only consumer would get invisible placeholder bars without the extra `@source` glob.
