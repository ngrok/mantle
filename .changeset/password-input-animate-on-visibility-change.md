---
"@ngrok/mantle": patch
---

`PasswordInput` now animates its eye icon on every visibility change, including a change to `showValue` from another control. Before this change, only a click on the built-in toggle animated the icon, so a page that reveals several fields from one control swapped the icons with no motion. The icon no longer animates when a controlled consumer ignores the toggle, because the icon did not change. Reduced motion still turns the animation off.
