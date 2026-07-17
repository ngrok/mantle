---
"@ngrok/mantle": minor
---

Add the `Sidebar` compound component (`@ngrok/mantle/sidebar`): a composable, collapsible
app-navigation sidebar. `Sidebar.Root` owns the state and renders no DOM (controlled/uncontrolled `open` +
`onOpenChange`, controlled/uncontrolled `openMobile` + `onOpenMobileChange`, and a configurable
`mobileBreakpoint`, default `lg`); `Sidebar.Nav` renders the panel — inline collapse-to-hidden on desktop
(animated width with `visibility: hidden` at rest, so collapsed content leaves the tab order and the
accessibility tree) and a left-side `Sheet` below the breakpoint; `Sidebar.Trigger` is an `IconButton` with
`aria-expanded`/`aria-controls` that toggles whichever presentation is active from anywhere under the root;
`⌘B`/`Ctrl+B` also toggles it (exact-modifier match, opt out with `keyboardShortcut={false}`).
Navigation composes `Sidebar.Header`/`Body`/`Footer`, `Sidebar.Group`/`GroupLabel`/`List`/`Item`/`ItemButton`
(with `current` → `aria-current="page"`, group labels wired to lists via `aria-labelledby`), plus
`Sidebar.SwitcherButton`, `Sidebar.Separator`, `Sidebar.AccountAvatar` (deterministic, WCAG 4.5:1-contrast
swatches), `Sidebar.UserAvatar`, and `Sidebar.SwitchAccountsRadioGroup`. Also exports the `useSidebar` hook
and the `SidebarState`, `SidebarAccount`, and `SidebarMobileBreakpoint` types. Public CSS variables:
`--sidebar-width` (default `16rem`) and `--sidebar-width-mobile` (default `18rem`), settable via
`Sidebar.Nav`'s `className`/`style` in both presentations. Docs: https://mantle.ngrok.com/components/navigation/sidebar
