---
"@ngrok/mantle": patch
---

Mantle components merge their own static class names at build time. The published components call `cx` only when a consumer passes `className` or a class name is not known at build time. Of the 332 `cx` calls in mantle components, 19 become string literals and 267 merge only when `className` is set. The class names that the components render do not change.
