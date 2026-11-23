---
"@ngrok/mantle": patch
---

`Sidebar.Nav` renders its nav once, in the browser's `<dialog>`. Above the root's `mobileBreakpoint` the closed `<dialog>` has no box, so the panel sits in the row as before. Below it the same tree is the mobile sheet. Before this change, a phone hydrated the desktop nav, removed it, and mounted every row again in a Radix `Sheet` on each open.

- A tap opens the sheet with no React render. In the docs app-shell demo on a phone at 4× CPU slowdown, the open's Interaction to Next Paint falls from 232 ms to 72 ms (median of 10), with the `Tooltip.Trigger` fix in this release.
- The browser traps focus, makes the page inert, closes the sheet on Escape or a click on the backdrop, and returns focus to the trigger. CSS locks page scroll.
- Alone, `Sidebar` costs 14.3 KB less gzip JS. On a page that also renders a `DropdownMenu`, it costs 1.4 KB less. A page that also renders a `Dialog` or a `Command` palette still loads Radix Dialog, and pays about 0.8 KB more.
- The look, the public API, and the expanded and collapsed state, with its cookie, do not change.

Behavior to know when you upgrade:

- The closed sheet keeps the nav in the document, so `Sidebar.Trigger` names it in `aria-controls` at every state.
- The mobile panel's `data-slot` is `sidebar-nav`, no longer `sidebar-nav sheet-content`. The `<dialog>` around it is `data-slot="sidebar-positioner"`. On desktop the `<dialog>` takes `role="generic"`, so screen readers meet only the `<nav>` landmark.
- An uncontrolled sheet calls `onOpenMobileChange` only when it opens or closes, not when `setOpenMobile` asks for the state it already has. `setOpenMobile(true)` above the breakpoint does nothing.
- Floats and dialogs in the open sheet mount in the `<dialog>`, above the panel. Toasts move above the open sheet.
