---
"@ngrok/mantle": patch
---

An `Accordion` section that a find-in-page or fragment-link reveal opens now stays open when the root accepts the open at once and the browser draws two frames before React commits it. Before, WebKit and Firefox could hide the accepted section again and drop its full height. The check for a refused reveal now starts after the commit, and a new reveal cancels the check of an earlier one.
