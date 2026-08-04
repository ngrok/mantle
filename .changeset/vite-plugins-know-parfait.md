---
"@ngrok/mantle-vite-plugins": patch
---

Teach `mantleTwSourcePlugin` about the new `parfait` subpath, so a consumer importing
`@ngrok/mantle/parfait` gets its classes scanned by Tailwind instead of an unstyled stack of sections.
Generated from `@ngrok/mantle`'s export map — no behavior change for any other component.
