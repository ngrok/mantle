---
"@ngrok/mantle": patch
---

`Accordion` answers a tap faster. A tap now re-renders only the sections that open or close, not every section. A closed `Accordion.Content` now sets up find-in-page with one ref callback instead of two effects. The DOM, the styles, and the behavior do not change.
