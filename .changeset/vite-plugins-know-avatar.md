---
"@ngrok/mantle-vite-plugins": patch
---

Teach `mantleTwSourcePlugin` about the new `avatar` subpath, so a consumer importing `@ngrok/mantle/avatar`
gets its classes scanned by Tailwind instead of an unstyled avatar. Generated from `@ngrok/mantle`'s export
map — no behavior change for any other component.
