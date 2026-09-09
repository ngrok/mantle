---
"@ngrok/mantle": patch
---

`Anchor` renders `rel="noopener noreferrer"` when `target="_blank"` and `rel` is omitted. The JSDoc and docs page promised this default; the code never set it. A `rel` you pass is used as-is. The `icon` prop is now decorative by default (`aria-hidden` unless the SVG carries a name, a role, or an explicit `aria-hidden`), as the docs already said, and the docs API table gains the `rel` row.
