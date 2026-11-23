---
"@ngrok/mantle": patch
---

`ThemeProvider`, `ThemeSwitcher`, `ThemeDropdownMenuItem`, `SegmentedControl`, `useMatchesMediaQuery`, `usePrefersReducedMotion`, `getPrefersReducedMotion`, and a press on `Slider` no longer throw in jsdom, which has no `matchMedia` and no pointer capture. With no `matchMedia`, a media query answers `false` and reduced motion is on, as on the server. A consumer's test can render them and act on them by role with no shims.
