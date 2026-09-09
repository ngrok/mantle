---
"@ngrok/mantle": patch
---

`CodeBlock.ExpanderButton` now carries `aria-controls` in the server HTML. `CodeBlock.Root` generates the `<pre>` id, so the button and the `<pre>` agree before hydration. Before this change the id reached the button through a mount effect, so the server HTML and the first client render had a button with `aria-expanded` but no `aria-controls`. The `<pre>` id is still a generated value with no stable format.
