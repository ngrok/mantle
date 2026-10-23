---
"@ngrok/mantle": patch
---

`ThemeSwitcher` animates the theme swap. The new theme grows in a circle from the button in a 300ms view transition, so every color changes in the same frame. Color transitions stop until the swap ends. Under `prefers-reduced-motion: reduce`, or in a browser without view transitions, the swap happens at once.
