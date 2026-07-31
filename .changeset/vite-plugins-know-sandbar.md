---
"@ngrok/mantle-vite-plugins": patch
---

Teach `mantleTwSourcePlugin` about the new `sandbar` subpath, so a consumer importing
`@ngrok/mantle/sandbar` gets its classes scanned by Tailwind instead of an unstyled bar.

`Sandbar` also needs its action buttons scanned: it renders a `Button` for each of
`Sandbar.SaveButton` and `Sandbar.DiscardButton`, and the build hoists Button's class strings into
`button-<hash>.js`, leaving none in `sandbar.js`. The plugin now scans the `button` chunk for
`sandbar` too — without it, a consumer importing only `@ngrok/mantle/sandbar` got a styled panel
wrapped around unstyled action buttons. No behavior change for any other component.
