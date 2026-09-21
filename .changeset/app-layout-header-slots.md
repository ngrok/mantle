---
"@ngrok/mantle": minor
---

`AppLayout.Body` renders mantle's `Main` landmark by default: `<main id="main" tabIndex={-1}>` with `data-slot="app-layout-body main"`. A skip link's default target now lands on the shell's only scroll container with no extra composition, so arrows, `Space`, and `PageDown` scroll the page as soon as the jump lands. `id` and `tabIndex` are no longer props on `AppLayout.Body`, for the same reason they are not props on `Main`.

This is a breaking change for a shell embedded in a page that already owns a `main` landmark (a docs demo, a test, a widget inside another layout). There the body now renders a second `main` with a duplicate `id`. Migrate:

- In a shell that owns the document, replace `<AppLayout.Body asChild><Main>…</Main></AppLayout.Body>` with `<AppLayout.Body>…</AppLayout.Body>`. The old form still renders one `main`, but the inner `Main` is redundant.
- In an embedded shell, replace `<AppLayout.Body>` with `<AppLayout.Body asChild><div>…</div></AppLayout.Body>`. The part adds its classes and `data-slot="app-layout-body"` to your element and no landmark.
- Replace a selector that matched `[data-slot="app-layout-body"]` exactly with `[data-slot~="app-layout-body"]`, because the default body's `data-slot` now ends in `main`.

`AppLayout.Header` gains three slots that carry the row's flex, so no call site sets `flex-1`, `min-w-0`, `shrink-0`, or `ml-auto` itself:

- `AppLayout.HeaderStart` (`data-slot="app-layout-header-start"`) is `shrink-0`: the home of `Sidebar.Trigger`, at the row's start.
- `AppLayout.HeaderContent` (`data-slot="app-layout-header-content"`) is `min-w-0 flex-1`: the home of the `Breadcrumb` trail. It fills the row and gives width back first, so a long trail scrolls inside it instead of pushing the actions off the card.
- `AppLayout.HeaderActions` (`data-slot="app-layout-header-actions"`) is `ml-auto shrink-0`: the page's actions, at the row's end. It takes only the width its children need and grows to the left as actions are added.

Each slot is a flex row with the header's own `gap-2`, accepts `asChild`, and appends its own `data-slot` after any you forward. A header composed without the slots renders as before.

Every page in an app that renders `AppLayout` renders one `AppLayout.Header`, with `Sidebar.Trigger` in `AppLayout.HeaderStart` and the route's breadcrumb trail in `AppLayout.HeaderContent`. The App Layout docs state that requirement and show the canonical shell: the shell renders `AppLayout.Content` around its `<Outlet />`, and each route renders `AppLayout.Header` and `AppLayout.Body` itself, so an action reads the page's own state. The docs compose the three slots in the app shell, standalone, editor, and landmark examples. A shell-owned header whose actions come from React Router route handles is the documented deviation: https://mantle.ngrok.com/recipes/header-actions-from-routes

Migration guide: https://mantle.ngrok.com/migrations/0007-app-layout-header-slots-migration

API reference: https://mantle.ngrok.com/layouts/app-layout#applayoutbody
