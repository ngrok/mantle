---
"@ngrok/mantle-server-syntax-highlighter": minor
---

The highlighter writes a short color class on each token, such as `tk` for a keyword, in place of an inline color style, and no element around a token in the foreground color. The classes come from `@ngrok/mantle`'s `mantle.css`, so the peer dependency on `@ngrok/mantle` is now `>=0.96.0`. Upgrade both packages together.

Breaking: the returned `html` holds no line-number elements, so `showLineNumbers` and `lineNumberStart` no longer change the numbers in it. `mantle.css` draws the numbers when the `<pre>` has `data-mantle-line-numbers="true"`. Pass the result's `showLineNumbers` and `lineNumberStart` to `createMantleCodeBlockValue`, and `CodeBlock.Code` sets both. Migration guide: https://mantle.ngrok.com/migrations/0033-compact-code-markup-migration
