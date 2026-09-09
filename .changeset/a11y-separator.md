---
"@ngrok/mantle": patch
---

`HorizontalSeparatorGroup` accepts `ref`, as the docs said it did. Its props are now `ComponentProps<"div">` instead of `HTMLAttributes<HTMLDivElement>`. The data attributes both parts emit (`data-orientation`, `data-separator`, `data-horizontal-separator-group`, and each `data-slot`) are now documented in the JSDoc and on the docs page.
