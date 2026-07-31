---
"@ngrok/mantle": patch
---

Keep a long `Breadcrumb` trail on one row: it now scrolls sideways with a faded edge instead of wrapping.

An app header is one row tall, so the trail wrapping onto a second row pushed the page down and left the
current page in the wrong place. `Breadcrumb.List` is now the scroll container, and its edges carry the same
`scroll-fade-x` mask as `Tabs.List` — the edge with crumbs beyond it fades out, and the edge with nothing
beyond it stays flush.

The trail starts at its end, because the end is the current page. It scrolls itself there whenever that end
moves — on mount, when a navigation swaps the crumbs, and when the row around it resizes — and leaves the
reader's own scroll position alone the rest of the time, including while a crumb holds focus. Tabbing to a
crumb the trail has scrolled past stays the browser's own job; the list carries `scroll-padding` the width of
the fade zone, so that crumb lands clear of the fade rather than under it.

Two supporting changes make that work in a real header:

- `Breadcrumb.Root` carries `min-w-0`, so inside a flex row such as `AppLayout.Header` the landmark gives up
  width to the row instead of pushing its siblings out of it.
- `Breadcrumb.Item` and `Breadcrumb.Separator` no longer shrink, so a crumb keeps its label on one line and
  the trail scrolls instead of breaking a label in two.

No prop, part, or export changed. Two things follow from the mask, both covered on the
[scroll fade](https://mantle.ngrok.com/base/scroll-fade) page: it fades everything `Breadcrumb.List` paints,
its own background and border included, so keep that styling on a wrapper; and it owns the element's
`mask-image`, so a second mask on the same element replaces it.

To keep the old wrapping behavior, hand the scrollport back:

```tsx
<Breadcrumb.List className="flex-wrap overflow-x-visible">
```

Without a scroll container the mask has nothing to animate against, so it stays fully opaque and the row wraps
as before. See https://mantle.ngrok.com/components/navigation/breadcrumb#overflow.
