---
"@ngrok/mantle": patch
---

The `Table` and `Tabs` source files now start with the `"use client"` directive. The published build strips the directive, so nothing changes for you today. A host that reads the source in a React Server Components tree now sees `Table` and `Tabs` as client components.
