---
"@ngrok/mantle": patch
---

Run one theme view transition at a time. A theme change during a reveal now ends the reveal and applies the theme without motion. Fast clicks on `ThemeSwitcher` no longer start a new view transition inside the click handler of a skipped one, which can crash the Chrome renderer.
