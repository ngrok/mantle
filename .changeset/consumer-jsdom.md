---
"@ngrok/mantle": patch
---

`ThemeProvider`, `ThemeSwitcher`, `SegmentedControl`, and a press on `Slider` no longer throw in jsdom, which has no `matchMedia` and no pointer capture. A consumer's test can render them and act on them by role with no shims.
