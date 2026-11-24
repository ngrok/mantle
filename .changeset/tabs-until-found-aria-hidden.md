---
"@ngrok/mantle": patch
---

An inactive `Tabs.Content` or `HeadlessTabs.Content` with `hiddenUntilFound` now has `aria-hidden`. Before, Chromium put it in the accessibility tree as an empty tab panel, and in Chromium, Firefox, and WebKit `getByRole("tabpanel")` found two panels. Find-in-page still reveals the panel and activates its tab.
