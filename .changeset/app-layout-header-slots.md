---
"@ngrok/mantle": patch
---

`AppLayout.Header` gains three slots that carry the row's flex, so no call site sets `flex-1`, `min-w-0`, `shrink-0`, or `ml-auto` itself:

- `AppLayout.HeaderStart` (`data-slot="app-layout-header-start"`) is `shrink-0`: the home of `Sidebar.Trigger`, at the row's start.
- `AppLayout.HeaderContent` (`data-slot="app-layout-header-content"`) is `min-w-0 flex-1`: the home of the `Breadcrumb` trail. It fills the row and gives width back first, so a long trail scrolls inside it instead of pushing the actions off the card.
- `AppLayout.HeaderActions` (`data-slot="app-layout-header-actions"`) is `ml-auto shrink-0`: the page's actions, at the row's end. It takes only the width its children need and grows to the left as actions are added.

Each slot is a flex row with the header's own `gap-2`, accepts `asChild`, and appends its own `data-slot` after any you forward. A header composed without the slots renders as before.

The App Layout docs compose the three slots in the app shell, standalone, editor, and landmark examples. A new recipe derives each route's actions from a React Router route handle and collapses them into one menu below the mobile breakpoint: https://mantle.ngrok.com/recipes/header-actions-from-routes

API reference: https://mantle.ngrok.com/layouts/app-layout#applayoutheaderstart
