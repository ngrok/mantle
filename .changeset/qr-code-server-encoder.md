---
"@ngrok/mantle": patch
---

A server-rendered `QrCode` now ships no encoder to the browser. The server render puts the finished SVG in the HTML, and hydration keeps it, so the client bundle no longer holds the `uqr` encoder (about 3.6 KB gzip). The API and the markup do not change, and the drawn code is the same.

A `QrCode` that the browser renders loads the encoder one time, then draws. This applies to a client navigation, a popover, a prop change, and an app that renders only in the browser (an SPA or Storybook). Until the encoder arrives, the frame shows an empty tile of the same size, and a test that reads the `d` attribute must wait for it. If the encoder fails to load, `QrCode.Root` throws to the nearest error boundary.

A bundler picks the encoder with the conditions of `package.json#imports`. A server bundle gets it at import, and this includes `workerd` and `edge-light`. A server bundle that resolves only `browser` waits for the encoder with `use`: streaming and `prerender` work, and `renderToString` throws until the first load ends.

See https://mantle.ngrok.com/components/data-display/qr-code.
