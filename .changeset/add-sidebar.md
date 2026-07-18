---
"@ngrok/mantle": minor
---

Add the `Sidebar` compound component (`@ngrok/mantle/sidebar`): a composable, collapsible
app-navigation sidebar. `Sidebar.Root` owns the state and renders no DOM (controlled/uncontrolled `open` +
`onOpenChange`, controlled/uncontrolled `openMobile` + `onOpenMobileChange`, and a configurable
`mobileBreakpoint`, default `lg`); `Sidebar.Nav` renders the panel — inline on desktop, collapsing to a
skinny icon rail (rows become square chips around their leading icons, group labels fade in place with
their rows retained so groupings and icon positions match the expanded state, switcher rows collapse to
their leading visual — everything stays in the tab order and the accessibility tree) — and a left-side
`Sheet` below the breakpoint; `Sidebar.Trigger` is an `IconButton` with `aria-expanded`/`aria-controls`
that toggles whichever presentation is active from anywhere under the root; `Sidebar.Rail` is a zero-width
click strip rendered as `Sidebar.Nav`'s next sibling that toggles the desktop sidebar from its edge
(pointer affordance only, `tabIndex={-1}`); `⌘B`/`Ctrl+B` also toggles it (exact-modifier match, opt out
with `keyboardShortcut={false}`).
Navigation composes `Sidebar.Header`/`Body`/`Footer`, `Sidebar.Group`/`GroupLabel`/`List`/`Item`/`ItemButton`
(with `current` → `aria-current="page"`, group labels wired to lists via `aria-labelledby`), plus
`Sidebar.SwitcherButton`, `Sidebar.Separator`, `Sidebar.AccountAvatar` (deterministic, WCAG 4.5:1-contrast
swatches), `Sidebar.UserAvatar`, and `Sidebar.SwitchAccountsRadioGroup`. `Sidebar.Body` fades its
overflowing edges with the `scroll-fade-y` mask (and hides its scrollbar inside the collapsed icon rail).
Also exports the `useSidebar` hook and the `SidebarState`, `SidebarAccount`, and
`SidebarMobileBreakpoint` types. Public CSS variables: `--sidebar-width` (default `16rem`),
`--sidebar-width-mobile` (default `18rem`), and `--sidebar-width-icon` (default `3.25rem`), settable via
`Sidebar.Nav`'s `className`/`style`. Docs: https://mantle.ngrok.com/components/navigation/sidebar
