---
"@ngrok/mantle": patch
---

A callback `ref` on `Checkbox`, `Select.Root`, `Select.Trigger`, `Table.Root`, `Tabs.List`, or `TextArea` now fires once when the element mounts. When the element unmounts, React runs the cleanup your callback returned, or calls the callback once with `null`. Before this change, every re-render of the component detached and re-attached the ref, so your callback ran with `null` and then with the element again on each render. A `ref` that measures the element, registers it, or starts an observer now does that work once. A `Select.Trigger` re-render also no longer round-trips two state updates through the Radix `Select` root. `Dialog.Content`, `Sheet.Content`, and `AlertDialog.Content` no longer pay an extra render pass on each re-render.

One rule comes with the stable ref: if you pass a different `ref` on a later render, the new ref receives the element the next time the element mounts, including a keyed remount in that same render. The same rule applies to every component that composes your `ref` with its own, including `Accordion`, `Alert`, `AlertCenter`, `Breadcrumb`, `Chart`, `Choice`, `CodeBlock`, `Input`, `List`, and `Sandbar`.
