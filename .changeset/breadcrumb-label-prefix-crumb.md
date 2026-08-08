---
"@ngrok/mantle": patch
---

Add three Breadcrumb pieces for the crumbs that are not plain links, all documented on the [Breadcrumb page](https://mantle.ngrok.com/components/navigation/breadcrumb):

- `Breadcrumb.Label` — the crumb that is not a link: a level with no page of its own, such as a section whose index URL only redirects (`Settings` in `Settings > General`). It renders a muted `<span>` with `data-slot="breadcrumb-label"`, no `href`, and no `aria-current`, and supports `asChild` like every other part.
- `Breadcrumb.Skeleton` — the placeholder for a trail segment whose labels are still loading: one `<li>` with `data-slot="breadcrumb-skeleton"` holding `itemCount` crumb-sized bars divided by carets, plus a screen-reader-only `role="status"` announcement (`label` defaults to "Loading breadcrumbs…"). Match `itemCount` to the resolved trail so the row keeps its width when the real crumbs arrive.
- The route-trail model, exported from `@ngrok/mantle/breadcrumb` and router-agnostic: the `routeBreadcrumb` factory creates link, label, and content crumbs as a discriminated `Crumb` union; `buildCrumbs` derives a `ResolvedCrumb` trail from any matches carrying `id`, `pathname`, and `handle` (react-router's `UIMatch` satisfies this structurally); `hasBreadcrumb` is the type guard; `BreadcrumbHandle<TMatch>` types a route's `handle` export.

The [breadcrumbs-from-routes recipe](https://mantle.ngrok.com/recipes/breadcrumbs-from-routes) now builds on these exports, so the only file an app copies is the renderer. It covers the prefix crumb (`routeBreadcrumb.label`) and the query-backed crumb: a content crumb shares the page's query and falls back to `Breadcrumb.Skeleton` while the query is pending.
