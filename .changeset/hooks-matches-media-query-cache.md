---
"@ngrok/mantle": patch
---

`useMatchesMediaQuery` now constructs one `MediaQueryList` per hook instance and reuses it across renders and change notifications. Before this change every render called `window.matchMedia` again, which parsed the query and allocated a new list each time. The returned value and the change subscription behave as before.
