---
"@ngrok/mantle": minor
---

Add `Breadcrumb`, hierarchy-path navigation at `@ngrok/mantle/breadcrumb` following the WAI-ARIA APG breadcrumb pattern: six compound parts — `Breadcrumb.Root` (a `<nav>` landmark labeled `"Breadcrumb"` by default, overridable via `aria-label` for localization or multiple trails), `Breadcrumb.List` (an `<ol>` whose order conveys the hierarchy), `Breadcrumb.Item` (`<li>` crumbs), `Breadcrumb.Link` (a router-agnostic `<a>` that composes onto framework links like react-router's `Link` via `asChild`), `Breadcrumb.Page` (a `<span>` with `aria-current="page"` marking the current, non-link crumb), and `Breadcrumb.Separator` (a `role="presentation"` + `aria-hidden` divider defaulting to a caret icon, replaceable with custom children like a slash). Every part supports `asChild`. Documented at https://mantle.ngrok.com/components/navigation/breadcrumb. Purely additive — no changes to existing components.
