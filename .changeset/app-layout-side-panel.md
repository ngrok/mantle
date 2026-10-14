---
"@ngrok/mantle": patch
---

`AppLayout` gains a side panel and a width cap for wide screens.

`AppLayout.SidePanel` (`data-slot="app-layout-side-panel"`) is a second card after `AppLayout.Content`, for an assistant, a details pane, or any surface that opens beside the page and closes again. It renders an `<aside>`, the `complementary` landmark, with the same card treatment as the content card, the same `AppLayout.Header` as its first child, and an `AppLayout.Body` (`asChild` with a `<div>`) for its scroll region. `open` is required and controlled. Open, the panel takes `--app-layout-side-panel-width` beside the card (`clamp(21rem, 24vw, 27rem)`) and the card absorbs the difference. Closed, it collapses to nothing and goes `inert`, with its children still mounted so a conversation keeps its scroll position and its in-flight reply across a close and a reopen. The change animates `flex-basis`, `opacity`, and `margin` over 260ms, and `motion-reduce:` turns the slide into a cut. Below `mobileBreakpoint` (`"sm"`, `"md"`, or `"lg"`, `"lg"` by default) the panel floats over the card instead of taking width from it; match the prop to `Sidebar.Root`'s. The panel stamps `data-state="open" | "closed"` and accepts `asChild`.

`AppLayout.Workspace` now caps at `--app-layout-max-width` (`128rem`, 2048px) and centers in the frame, so an ultrawide monitor gets a centered shell instead of a card stretched across it. The cap is the width at which a 13rem rail, a `max-w-7xl` page with its padding, and an open side panel at its 27rem cap are each at full size. `AppLayout.Root` still paints `bg-base` edge to edge, and `AppLayout.Notice` still spans the full window. Set the variable to `none` on `AppLayout.Root` to let the row fill any width, and merge `className="ml-0"` on the workspace to pin the row to the start edge. The workspace is also `relative` and `min-w-0`, so a floating side panel resolves against the row and a nested row cannot push the panel off the window.

Docs: https://mantle.ngrok.com/layouts/app-layout#side-panel
