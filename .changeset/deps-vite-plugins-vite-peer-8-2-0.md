---
"@ngrok/mantle-vite-plugins": patch
---

Move the optional `vite` peer range floor from `^8.1.5` to `^8.2.0`, which tracks the workspace's Vite
version. Nothing in the plugins needs 8.2.0. Consumers still on vite 8.1.x will see an unmet-peer warning
until they upgrade.
