---
"@ngrok/mantle": patch
---

Add `Breadcrumb.Label`, the crumb that is not a link — a level with no page of its own, such as a section whose index URL only redirects (`Settings` in `Settings > General`). It renders a muted `<span>` with `data-slot="breadcrumb-label"`, no `href`, and no `aria-current`, so the trail shows the level without offering it as a destination. Like every other part, it supports `asChild`.

The [breadcrumbs-from-routes recipe](https://mantle.ngrok.com/recipes/breadcrumbs-from-routes#the-prefix-crumb) now covers the prefix crumb: a layout route contributes one with the recipe's `routeBreadcrumb.label` factory, and the renderer draws it as a `Breadcrumb.Label`.

See the [Breadcrumb docs](https://mantle.ngrok.com/components/navigation/breadcrumb#the-prefix-crumb).
