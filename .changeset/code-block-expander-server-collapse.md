---
"@ngrok/mantle": patch
---

Fix the layout shift of a `CodeBlock` with an `ExpanderButton` on page load. The server HTML painted the code at full height, and hydration then collapsed it. Now CSS collapses the code when `CodeBlock.ExpanderButton` is a child of `CodeBlock.Root`, so the server HTML paints the code collapsed, with JavaScript on or off.
