---
"@ngrok/mantle": patch
---

A collapsible `CodeBlock` that mounts on the client now paints collapsed on its first frame. `CodeBlock.ExpanderButton` registers with `CodeBlock.Root` in a layout effect, so the `<pre>` carries `data-state="collapsed"` before the browser paints the mount. Before this change the block painted at full height for one frame and then snapped to the collapsed height, which shifted the content below it on every client-side navigation. Server HTML still renders the `<pre>` without `data-state`, so a server-rendered block collapses at hydration as before.
