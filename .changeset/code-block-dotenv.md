---
"@ngrok/mantle": patch
"@ngrok/mantle-server-syntax-highlighter": patch
---

`dotenv` joins the supported code block languages. `mantleCode("dotenv")`, Markdown fences, and the server highlighter render `.env` files with Shiki's dotenv grammar, which ships in the existing `shiki` dependency. Before this change, a `dotenv` fence was not highlighted, and the rehype plugin left it as a plain `<pre>` without `CodeBlock` styles.
