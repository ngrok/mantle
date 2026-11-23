---
"@ngrok/mantle": patch
---

Add `Markdown` at `@ngrok/mantle/markdown`, a renderer for a Markdown answer that streams in, such as an AI assistant reply. While `streaming`, it closes unfinished syntax at the end of the text, such as `**bo` or an open fence, so the answer never flashes raw Markdown. It lexes only the text after the last finished block, and a finished block does not render again. Code fences render as `CodeBlock` and tables as `Table`. The answer is not a live region: the root is `aria-busy` while it streams, and the docs show how a chat announces the start and end of an answer. Links and images with an unsafe scheme render as text, and raw HTML outside a short list of inline tags renders as text. Pass `components` to replace the element for a token type, and `extensions` for marked extensions, such as `markdownMath()` for `$` math.

Add `useMarkdownStream` to read an answer from a stream of text chunks, with resume from the last offset and retry, and `useFollowStream` to keep a scroll container at the end of the answer until the user scrolls up.
