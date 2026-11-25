---
"@ngrok/mantle": patch
---

`CodeBlock` scopes two styles without `:has()`, so a streamed block no longer restyles all of its lines for each line that a stream inserts:

- The copy-button space on the first two lines now applies to the code after a `CodeBlock.CopyButton` in `CodeBlock.Body`. A copy button placed after the code no longer reserves that space.
- `CodeBlock.Code` sets `data-foldable` on its `<pre>` when the highlighted HTML has fold toggles. The fold gutter and fold line height in `mantle.css` key off that attribute, not `pre:has(.mantle-code-fold-toggle)`.
