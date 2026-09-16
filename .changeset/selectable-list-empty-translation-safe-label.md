---
"@ngrok/mantle": patch
---

`SelectableList.Empty` no longer crashes on a page a browser translation engine has translated. The part is a `role="status"` live region that stays mounted, so React removes the message from inside it when the filter matches options again. A message built from more than one node, such as `No results for <strong>{query}</strong>.`, puts real text nodes there. Google Translate reparents each one first, and the `removeChild` threw `NotFoundError`, which tore down the React root and blanked the page. One keystroke in each direction was enough to hit it.

The message now renders inside a `<span data-slot="selectable-list-empty-label">`. React removes that element instead of the text nodes, and an element removal cannot throw. The span is `display: contents`, so it adds no box: the message stays a direct child of the centered region, and the layout is unchanged. A message that is a lone string also takes React's `textContent` path now, which wipes the translation wrapper instead of fighting it.

The new slot is public API. The JSDoc and the docs-page API reference list it beside `selectable-list-empty`.
