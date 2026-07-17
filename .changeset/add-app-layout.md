---
"@ngrok/mantle": minor
---

Add the `AppLayout` compound component (`@ngrok/mantle/app-layout`): a viewport-locked application
shell that never scrolls itself. `AppLayout.Root` fills its nearest sized ancestor (merge
`className="fixed inset-0"` to pin a real app shell to the viewport); `AppLayout.Notice` is a full-window
strip above everything for impersonation banners and environment warnings; `AppLayout.Body` is the flex row
where a `Sidebar.Nav` composes beside `AppLayout.Inset`; `AppLayout.Content` is the rounded `bg-card` card
that is the shell's only scroll container (`overflow-y-auto overscroll-none`) — compose the `Main` landmark
into it via `asChild`; and `AppLayout.Header` is the sticky toolbar `<header>` rendered as `Content`'s first
child (a `Sidebar.Trigger` and breadcrumbs live there, and its `h-14` height aligns it with
`Sidebar.Header`'s switcher row). The shell is deliberately unaware of any sidebar. All parts support
`asChild` and forward refs.
Docs: https://mantle.ngrok.com/layouts/app-layout
