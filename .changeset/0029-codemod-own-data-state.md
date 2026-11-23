---
"@ngrok/mantle": patch
---

The 0029 codemod keeps the classes of an element that sets its own `data-state`. It writes them in the bracket form, such as `data-[state~=closed]:`, as it does in a file that imports Radix. Before, it wrote mantle's names, such as `not-data-open:`, which never match that element.
