---
"@ngrok/mantle": patch
---

A callback `ref` on `CodeBlock.Code` is now called once, when the `<pre>` mounts, as long as you pass the same function on each render. When the `<pre>` unmounts, React runs the cleanup your callback returned, or calls the callback once with `null`. Before this change every re-render of the block, including each `CodeBlock.ExpanderButton` click, called the ref with `null` and then with the node again, so a ref that measures or observes the `<pre>` did its setup work several times per block.
