---
"@ngrok/mantle-vite-plugins": patch
---

Add `breadcrumb`, `centered-layout`, and `theme-switcher` to `MANTLE_COMPONENT_NAMES` so `mantleTwSourcePlugin` recognizes imports of the new `@ngrok/mantle` subpaths and emits their `@source` directives — without this, apps importing the new components would silently get no Tailwind classes for them.
