---
"@ngrok/mantle-vite-plugins": patch
---

Raise the optional `vite` peer range floor from `^8.1.5` to `^8.2.0`. Consumers still on vite 8.1.x will see an
unmet-peer warning until they upgrade; nothing in the plugins requires 8.2.
