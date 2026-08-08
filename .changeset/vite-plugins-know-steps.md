---
"@ngrok/mantle-vite-plugins": patch
---

Teach `mantleTwSourcePlugin` about the new `steps` subpath, so a consumer importing
`@ngrok/mantle/steps` gets its classes scanned by Tailwind instead of an unstyled guide.

`Steps` pulls in only mantle's `Slot`, which emits no utility classes of its own, so it needs no
extra chunk beyond its own. No behavior change for any other component.
