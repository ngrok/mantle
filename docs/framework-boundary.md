# Framework Boundary

Read this file before you add an import to `packages/mantle/src`, or before you add a part that reads router state.

`@ngrok/mantle` depends on React and on nothing else in an app's stack. Code under `packages/mantle/src` never
imports a router, a data framework, or an app framework: not `react-router`, `@tanstack/react-router`,
`next`, `@remix-run/*`, or their types. The peer set is `react`, `react-dom`, `tailwindcss`, and
`@phosphor-icons/react`, and a router never joins it. An oxlint override on `packages/mantle/src/**` makes
such an import an error.

**Why:** a router in mantle's source is a peer every consumer installs, pinned to that router's major.
Mantle shipped `AutoScrollToHash` with a `react-router` peer once and removed both in a breaking release.
ngrok's apps do not share one router, and a docs site, a test, or a fixture must render every part with no
router at all.

Four shapes keep the boundary:

- **Type the seam structurally.** When a part reads router state, declare the fields it reads as a plain
  type and let the router's own type satisfy it. `BreadcrumbMatch` (`id`, `pathname`, `handle`) is the
  model: react-router's `UIMatch` satisfies it, and so does a test fixture.
- **Take the framework's element through `asChild`.** A link part renders an `<a>` and composes onto the
  app's `Link` (`Anchor`, `Breadcrumb.Link`, `Sidebar.ItemButton`). Mantle never renders a router's
  component.
- **Put the glue in a recipe.** The component that calls `useMatches()`, `useLocation()`, or
  `useSearchParams()` lives in the app. The docs ship it as a recipe under `apps/www/app/docs/recipes/`,
  with its file pinned verbatim by a `recipe-fences.test.ts`
  ([Breadcrumbs from Routes](../apps/www/app/docs/recipes/breadcrumbs-from-routes.mdx),
  [Header Actions from Routes](../apps/www/app/docs/recipes/header-actions-from-routes.mdx),
  [Route Announcer](../apps/www/app/docs/recipes/route-announcer.mdx)). The recipe states which decision
  the app owns: the router, its `Link`, and its match type.
- **Name a framework only as an example.** JSDoc and docs may say "e.g. react-router's `<Link>`" to show
  the composition. The API and its types never require it.

`apps/www` is an app and uses React Router freely. `@ngrok/mantle-vite-plugins` targets Vite by design;
the boundary above is about the component library.
