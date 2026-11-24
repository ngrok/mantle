---
"@ngrok/mantle": patch
---

After hydration, an inactive `Tabs.Content` or `HeadlessTabs.Content` with `hiddenUntilFound` has `aria-hidden`. Before, Chromium put it in the accessibility tree as an empty tab panel, and in Chromium, Firefox, and WebKit `getByRole("tabpanel")` found two panels. The server HTML leaves `aria-hidden` out, so a panel that the browser reveals before hydration stays readable. Find-in-page still reveals the panel and activates its tab.
