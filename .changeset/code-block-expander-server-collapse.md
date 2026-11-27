---
"@ngrok/mantle": patch
---

Fix the layout shift of a `CodeBlock` with an `ExpanderButton` on page load. The server HTML painted the code at full height, and hydration then collapsed it. Now a `mantle.css` rule collapses the code when `CodeBlock.Root` holds a `CodeBlock.ExpanderButton`, so the server HTML paints the code collapsed. A `max-h-*` class on `CodeBlock.Code` still sets the collapsed height. With scripting off, the button cannot expand the code, so the button hides and the code drops the default collapsed height.
