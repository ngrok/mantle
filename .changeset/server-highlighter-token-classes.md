---
"@ngrok/mantle-server-syntax-highlighter": patch
---

The highlighter writes a short color class on each token, such as `tk` for a keyword, in place of an inline color style, and no element around a token in the foreground color. The classes come from `@ngrok/mantle`'s `mantle.css`, so use it with an `@ngrok/mantle` that has them.
