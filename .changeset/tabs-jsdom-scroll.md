---
"@ngrok/mantle": patch
---

`Tabs` and `HeadlessTabs`: keyboard focus in a horizontal list no longer throws where `scrollIntoView` is missing, such as plain jsdom, which also has no `matchMedia`. Focus still moves, and the tab does not scroll. Browsers are not affected.
