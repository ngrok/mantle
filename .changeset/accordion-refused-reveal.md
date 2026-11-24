---
"@ngrok/mantle": patch
---

A controlled `Accordion` that refuses a find-in-page or fragment-link reveal in `onValueChange` now hides the section again. Before, the content stayed visible while its trigger reported `aria-expanded="false"`.
