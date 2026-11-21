---
"@ngrok/mantle": patch
---

Register the semantic color tokens with `@theme inline reference`. Tailwind no longer writes 73 `--token: var(--token)` declarations into `@layer theme`, so the compiled CSS is 4.0 KB smaller (minified). The utilities and the resolved colors do not change.

The removed declarations refer to themselves, so they were invalid. The theme rules override them on `:root`, so pages see no change. In a shadow root that adopts mantle's CSS, `:host` now inherits the page value of each token. Before, each token was invalid on the host.
