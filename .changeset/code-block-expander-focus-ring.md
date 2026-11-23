---
"@ngrok/mantle": patch
---

`CodeBlock.ExpanderButton` shows the mantle focus ring on keyboard focus, as the other controls do. The ring draws inside the button, so the rounded `CodeBlock.Root` does not clip it. Before, the button showed the browser's default outline, which the root clipped.
