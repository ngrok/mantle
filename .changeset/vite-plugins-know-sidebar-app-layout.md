---
"@ngrok/mantle-vite-plugins": patch
---

Regenerate `MANTLE_COMPONENT_NAMES` to include the new `alert-center`, `app-layout`, and `sidebar`
component subpaths so consuming apps emit Tailwind `@source` directives for them.
