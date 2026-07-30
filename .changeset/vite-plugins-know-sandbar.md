---
"@ngrok/mantle-vite-plugins": patch
---

fix(tw-source): teach `mantleTwSourcePlugin` about `Sandbar`'s internal chunks

Map `sandbar` to the `button` internal chunk in `INTERNAL_CHUNKS_BY_COMPONENT`.
`Sandbar` renders a `Button` for each of `Sandbar.SaveButton` /
`Sandbar.DiscardButton`, and the build hoists Button's class strings into
`button-<hash>.js`, leaving none in `sandbar.js` — so without the mapping a
consumer importing only `@ngrok/mantle/sandbar` got a styled panel wrapped
around unstyled action buttons.
