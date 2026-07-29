---
"@ngrok/mantle": patch
---

Fix six defects and restructure `AppLayout`, from migrating the ngrok dashboard onto the app shell
([#1374](https://github.com/ngrok/mantle/issues/1374)). Every one of these failed **silently**, which is what
made them expensive.

**`AppLayout` is restructured, and this is breaking.** The card now reads like every other mantle surface —
`Content` wrapping `Header` + `Body`, the same shape as `Sidebar.Nav`, `Dialog.Content`, `Sheet.Content`, and
`Card.Root`:

```
AppLayout.Root                        AppLayout.Root
├── AppLayout.Notice                  ├── AppLayout.Notice
└── AppLayout.Body          ─────►    └── AppLayout.Workspace
    └── AppLayout.Inset                   └── AppLayout.Content
        └── AppLayout.Content                  ├── AppLayout.Header
            └── AppLayout.Header               └── AppLayout.Body
```

Migration, in order:

1. **`AppLayout.Body` → `AppLayout.Workspace`** (the row holding the rail beside the card). Same classes,
   and `data-slot="app-layout-workspace"`.
2. **`AppLayout.Inset` is removed.** Its child moves up to be a direct child of `AppLayout.Workspace`; the
   card gutter it owned is now `AppLayout.Content`'s own margin, driven by the new public
   `--app-layout-card-gutter` (default `0.5rem`). The gutter has to belong to the card — the only other
   element that could hold it also contains the rail, so padding there pushed the sidebar off the window
   edge and broke the flush collapsed icon rail.
3. **`AppLayout.Body` is now the page region**, and the shell's only scroll container. Render your
   `<Outlet />` here, and **compose `Main` onto it via `asChild` instead of onto `AppLayout.Content`** —
   `SkipToMainLink` focuses `#main`, so the landmark has to *be* the scrollport or arrows, `Space`, and
   `PageDown` do nothing after a skip. `data-slot="app-layout-body"` now names this element.
4. **`AppLayout.Header` renders a `<div>`, not a `<header>`**, and is no longer `sticky`. With `Main` on
   `AppLayout.Body`, a `<header>` here would have no sectioning ancestor and would therefore *become* the
   ARIA `banner` landmark. Compose your own element with `asChild` if you need one.

There is deliberately **no `Footer` part**. A bar pinned to the bottom of the card is almost always a page's
own — an editor's validity line, a save bar — and a route rendering through an `<Outlet />` inside
`AppLayout.Body` could never reach a shell-level one, because it would be a sibling of the region the route
renders into. The docs show how to pin one inside the page region with three flex rules instead.

**Fixes:**

- **`AppLayout.Content` is now a containing block** (`relative`). It was a scroll container but not
  positioned, so absolutely-positioned page content resolved against `AppLayout.Root` — `fixed inset-0` in a
  real shell — and painted across the sidebar rail.
- **A page can finally fill the card.** `AppLayout.Header` was `sticky` but *in flow* inside a
  `display: block` scroll container, so a page using `h-full` overflowed by exactly the toolbar's height
  (measured: 54px), leaving a bottom-pinned bar below the fold on every load. The toolbar is now a
  `shrink-0` sibling *outside* the scrollport, so it is pinned by construction, cannot be overlapped by a
  page's own `sticky top-0`, and steals no height. `AppLayout.Body` is a flex item that is **block inside**,
  which is what lets `h-full` fit the card while `mx-auto max-w-7xl` still centers — as a flex *child*, auto
  margins beat `align-items: stretch` and that container would shrink-to-fit, getting narrower as the
  viewport got wider.
- **`AppLayout.Content` is `overflow-clip`, not `overflow-hidden`.** `hidden` is a scroll container that
  paints no scrollbar: a toolbar wider than the card let <kbd>Tab</kbd> scroll it sideways, translating the
  header and page out of view with no way back.
- **`Slot` composes a render-prop `className` or `style` instead of dropping it.** A function `className`
  resolved to `""` through `cx` and a function `style` was overwritten by prop merging, so a react-router
  `NavLink` composed through an `asChild` mantle part silently lost `className={({ isActive }) => …}` — the
  row's highlight just never turned on. `Slot` now composes a function of the same shape, forwarding the
  child's own arguments to the child's function and merging the resolved value at the usual child-wins
  precedence, so `<Sidebar.ItemButton asChild><NavLink className={({ isActive }) => …} /></Sidebar.ItemButton>`
  works and no longer needs `current` derived from `useMatch` for accessibility (`NavLink` sets
  `aria-current="page"` itself). `Slot` never calls the function, so it needs to know nothing about the
  argument. Parts that forward `asChild` straight to a Radix primitive (`Tooltip.Trigger`,
  `DropdownMenu.Trigger`, `Dialog.Trigger`) still use Radix's own slot, which joins a function `className`
  into the class string — nest a mantle-backed part inside those.
- **`⌘B` / `Ctrl+B` respects the platform and text fields.** The sidebar shortcut accepted *either* modifier
  on *every* platform, so on macOS `Ctrl+B` — the native emacs-style "move the caret back one character" that
  every macOS text field binds — was `preventDefault`ed and toggled the sidebar instead, including inside
  embedded editors like Monaco. The modifier is now resolved per platform and the two never substitute for
  each other, and the shortcut is ignored while focus is in an `<input>`, `<textarea>`, `<select>`, or any
  `contenteditable` host.

**Additive:**

- **`Sidebar.Tooltip`** labels a row while — and only while — the desktop panel is collapsed to the icon
  rail. The rail keeps labels in the accessibility tree but leaves a sighted pointer user with an unlabeled
  icon column. It gates its *content* rather than its `Tooltip.Root`, so toggling the rail never drops focus
  off the row the user was on, and it composes with a menu trigger
  (`DropdownMenu.Root > Sidebar.Tooltip > DropdownMenu.Trigger asChild`). Requires a `TooltipProvider`
  ancestor, like any `Tooltip.Root` — it deliberately does not mount its own, so app-wide delay settings
  still apply.
- **`extractSidebarStateCookie` / `serializeSidebarStateCookie` / `SIDEBAR_STATE_COOKIE_NAME`** from
  `@ngrok/mantle/sidebar` — the SSR-safe pair for persisting the collapsed state, mirroring
  `extractThemeCookie`. A cookie is the only storage the server can read, so it is the only way to render the
  collapsed state into the initial HTML with no first-frame correction; use it with `defaultOpen`, not
  controlled `open`. `extractSidebarStateCookie` returns `boolean | undefined` so a first-time visitor stays
  distinguishable from someone who deliberately collapsed the rail.

Docs: https://mantle.ngrok.com/layouts/app-layout — new sections cover sizing a page to the card (with a live
editor-page example), scroll restoration with an inner scrollport, and the desktop-only nature of the
sidebar-header alignment. The Sidebar and Alert Center pages gain rail tooltips, cookie persistence, the
one-level-deep navigation precondition, hoisting `AlertCenter.Root` above the shell for route-authored
alerts, and testing guidance for the alert center's intentionally duplicated title text.
