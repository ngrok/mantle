---
"@ngrok/mantle": minor
---

`CodeBlock` scopes three styles without `:has()`, so a streamed block no longer restyles all of its lines for each line that a stream inserts:

- The copy-button space on the first two lines comes from a sibling selector on a `CodeBlock.CopyButton` before the code, not `:has()`. A copy button after the code no longer reserves the space on highlighted lines; put it first, as the docs show (migration 0033, step 7).
- `CodeBlock.Code` sets `data-foldable` on its `<pre>` when the highlighted HTML has fold toggles. The fold gutter and fold line height key off that attribute, not `pre:has(.mantle-code-fold-toggle)`. A `<pre>` that you render yourself with folding HTML must set `data-foldable` too.
- The folded `⋯` marker shows after a collapsed fold toggle through a sibling selector, not `.mantle-code-line:has(> .mantle-code-fold-toggle[aria-expanded="false"])`.

Docs: https://mantle.ngrok.com/components/data-display/code-block#api-reference
