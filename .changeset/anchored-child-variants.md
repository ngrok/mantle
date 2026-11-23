---
"@ngrok/mantle": patch
---

A style pass over the whole page costs less, such as when a `Dialog`, `AlertDialog`, or `Sheet` opens. Mantle's parts no longer use Tailwind's `*:` and `**:` variants or an arbitrary variant with a selector list. Those compile to a rule such as `:is(.class > *)`, which Chromium tries on each element of the page. The same styles now compile to rules such as `.class > *`, which Chromium skips at once outside the part. Each rule keeps its specificity and matches the same elements, so mantle's parts look the same. Tailwind sorts these rules after its variant classes, so a class of equal specificity that you put on a styled child, such as `hover:flex-none` on `Dialog.Title`, no longer overrides them. On a page of 1,200 elements at 4× CPU slowdown, the largest style pass of a `Dialog` open drops from 32 ms to 28 ms in Chromium.
