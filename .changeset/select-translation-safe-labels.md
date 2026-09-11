---
"@ngrok/mantle": patch
---

`Select` no longer crashes on a page a browser translation engine has translated. Radix portals the selected item's text into `Select.Value` and keys the placeholder, so React removed a bare text node from the trigger whenever the value changed, the placeholder gave way to a first value, or the select unmounted on navigation. Google Translate reparents that text node first, and the `removeChild` threw `NotFoundError`, which tore down the React root and blanked the page.

`Select.Item` now renders `children` inside a `<span data-slot="select-item-label">`. `Select.Value` renders `placeholder` inside a `<span data-slot="select-placeholder">` and your own `children` inside a `<span data-slot="select-value-label">`. React removes those elements instead of a text node, and an element removal cannot throw. Each span is `display: contents`, so it adds no box: your own item or value content stays the direct layout child of the value node, and a trigger override such as `[&>span]:flex-1` keeps working. A lone string child on `Select.Value` also takes React's `textContent` path now, which wipes the translation wrapper, so a swap between text and an element there is safe too.

`Select.Value` also carries `data-slot="select-value"`. All four slots are public API, and the data-attribute tables on the docs page list them. You no longer need to wrap item labels in your own `<span>`.

`translate="no"` on a `Select.Item` now also rides on the label span, so the copy the trigger shows stays untranslated. Set it on an item whose label is an ID, a path, a filename, or a key.
