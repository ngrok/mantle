---
"@ngrok/mantle": patch
---

While a `CodeBlock.Code` streams its lines in, such as a fence in a `Markdown` answer, its line numbers draw in one sticky column for each group of 64 lines, in place of a sticky number on each line. The numbers look and pin the same, and a long block costs less layout on each update, most of all in Safari. Once the stream ends and the block has its fold ranges, each line draws its own number again. Code with pre-rendered HTML is unchanged.

Until the stream ends, two hooks do not apply to the numbers:

- A rule on `.mantle-code-line::before`. Style the streaming numbers through `.mantle-code-gutter::before`.
- A `--mantle-line-number-start` that you set in CSS. The streaming numbers start at 1, because `useCodeBlockStream` has no start option.

A streamed block keeps the gutter when its caller never passes `complete`, or when its language does not fold.

`CodeBlock.Code` now sets `dir="ltr"` on its `<pre>`, so code reads left to right in a right-to-left page. Before, the lines aligned right, the numbers moved to the right edge, and the bidi algorithm moved punctuation, such as the `;` at the end of a line. The copy button stays at the top right, at the end of the first lines, as in a left-to-right page. Set `dir` on `CodeBlock.Code` to change it.
