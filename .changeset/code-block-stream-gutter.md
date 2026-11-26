---
"@ngrok/mantle": patch
---

The line numbers of a `CodeBlock.Code` that renders streamed lines, such as a fence in a `Markdown` answer, now draw in one sticky column for each group of 64 lines, in place of a sticky number on each line. The numbers look and pin the same, and a long block costs less layout on each update, most of all in Safari. Code with pre-rendered HTML is unchanged.
