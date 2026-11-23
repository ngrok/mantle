---
"@ngrok/mantle": patch
---

A server-rendered `QrCode` now ships no encoder to the browser. The server render puts the finished SVG in the HTML, and hydration keeps it, so the client bundle no longer holds the `uqr` encoder (about 3.6 KB gzip). If only the browser knows the value, `QrCode.Root` loads the encoder one time and the code draws when it arrives. A failed load reaches the nearest error boundary. The API, the markup, and the look do not change.

A bundler picks the encoder with the `browser` condition of `package.json#imports`. A server bundle that resolves the `browser` condition, such as an edge runtime, waits for the encoder before it renders the code.

See https://mantle.ngrok.com/components/data-display/qr-code.
