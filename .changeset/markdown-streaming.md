---
"@ngrok/mantle": patch
---

Add `Markdown` at `@ngrok/mantle/markdown`, a renderer for a Markdown answer that streams in, such as an AI assistant reply. While `streaming`, it closes unfinished syntax at the end of the text, such as `**bo` or an open fence, so the answer never flashes raw Markdown. It reads CommonMark and GitHub Markdown with its own lexer, which takes linear time on any input. It lexes only the text after the last finished block, and a finished block does not render again. Code fences render as `CodeBlock` and tables as `Table`. The answer is not a live region: the root is `aria-busy` while it streams, and the docs show how a chat announces the start and end of an answer. Links and images with an unsafe scheme render as text, and raw HTML outside a short list of inline tags renders as text. Pass `components` to replace the element for a token type, and `extensions` for more tokenizers, such as `markdownMath()` for `$` math.

Add `useMarkdownStream` to read an answer from a stream of text chunks, with resume from the last offset and retry.

`Markdown` loads the syntax highlighter, its worker, and each grammar only when a code fence renders. An import of only `useMarkdownStream` or `markdownMath` tree-shakes the renderer, and costs about 1 KB gzip.

`@ngrok/mantle` no longer depends on `marked`. `Markdown` reads Markdown with its own lexer, and mantle owns the token types: `MarkdownToken`, `MarkdownExtensionToken`, and `MarkdownTokens` take the place of marked's `Token` and `Tokens`, with the same shapes. A component or an extension that imported a type from `marked` imports it from `@ngrok/mantle/markdown` now. An extension's tokenizer gets no `this.lexer`.
