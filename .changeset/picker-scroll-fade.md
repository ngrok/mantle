---
"@ngrok/mantle": patch
---

Fade the scrolling edges of the `Select`, `Combobox`, and `MultiSelect` lists with `scroll-fade-y`, so a long list shows that it has more options.

- The listbox is now a viewport inside the popup (`data-slot="select-viewport"`, `"combobox-viewport"`, or `"multi-select-viewport"`). It has `role="listbox"`, the list's `id`, and an `aria-label`, `aria-labelledby`, or `aria-describedby` you pass to `Content`. The fade masks only the viewport, so the popup's border, shadow, and open animation stay whole.
- `Content` keeps its `ref`, `className`, other props, and `data-slot`, on the popup. Its `onScroll` and `onScrollEnd` go to the viewport, which is what scrolls. Three uses change: `getByRole("listbox")` now finds the viewport, so read the popup's attributes from `.closest("[popover]")`; to scroll the list, scroll the viewport, not the `ref` element; and a `className` that sets padding or spacing for the items no longer reaches them.
- The keyboard highlight now stops 1.5rem from each edge (`scroll-py-6`), so it never sits in the fade. A list too short for that shares the room, so the option still shows in full.
- With a `MultiSelect.ContentFooter`, only the top edge fades, because the sticky footer sits on the bottom edge.
