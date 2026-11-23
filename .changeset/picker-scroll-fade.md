---
"@ngrok/mantle": patch
---

Fade the scrolling edges of the `Select`, `Combobox`, and `MultiSelect` lists with `scroll-fade-y`, so a long list shows that it has more options.

- Each list now scrolls in an inner viewport (`data-slot="select-viewport"`, `"combobox-viewport"`, or `"multi-select-viewport"`). The fade masks only the viewport, so the list's border, shadow, and open animation stay whole. The `Content` part keeps its role, props, `ref`, `className`, and `data-slot`.
- The keyboard highlight now stops 1.5rem from each edge (`scroll-py-6`), so it never sits in the fade.
- With a `MultiSelect.ContentFooter`, only the top edge fades, because the sticky footer sits on the bottom edge.

The `scroll-fade-*` utilities now animate `mask-position` and `mask-size` instead of registered custom properties. They look the same, and a scroll frame no longer restyles the content of the container. The private `--_fade-*` and `--_scroll-fade-*` variables are gone.
