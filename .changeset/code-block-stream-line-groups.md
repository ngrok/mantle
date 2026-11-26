---
"@ngrok/mantle": patch
---

A `CodeBlock.Code` that renders streamed lines, such as a fence in a `Markdown` answer, now does less work for each update. It renders its lines in groups of 64, and only a group with a changed line renders again. It also no longer escapes the whole code as HTML on each update, because streamed lines never read that HTML. The output is the same.
