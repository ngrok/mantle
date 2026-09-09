---
"@ngrok/mantle": patch
---

Close accessibility gaps in `CodeBlock`.

- The `<pre>` no longer carries `aria-expanded`, which is not valid on a `<pre>`. It now carries `data-state="collapsed" | "expanded"` while a `CodeBlock.ExpanderButton` is composed, and the collapsed max height reads that attribute. `CodeBlock.ExpanderButton` keeps its own `aria-expanded` and `aria-controls`. If you styled the collapsed state with the `aria-collapsed:` variant on the `<pre>`, use `data-[state=collapsed]:` instead.
- Line numbers are `aria-hidden`, so a screen reader reads the code, not "1 const x".
- `CodeBlock.CopyButton` announces "Copied" through an always-mounted `role="status"` element after a copy.
- `CodeBlock.ExpanderButton` no longer types `asChild`. The prop threw at runtime, because the button renders its own label and caret.
