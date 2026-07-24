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
that toggles whichever presentation is active from anywhere under the root; `⌘B`/`Ctrl+B` also toggles it
(exact-modifier match; single-owner — with multiple mounted roots only the first claimant handles the
keypress; opt out with `keyboardShortcut={false}`).
Navigation composes `Sidebar.Header`/`Body`/`Footer`, `Sidebar.Group`/`GroupLabel`/`List`/`Item`/`ItemButton`
(with `current` → `aria-current="page"`, group labels wired to lists via `aria-labelledby`), plus
`Sidebar.SwitcherTrigger`, `Sidebar.Separator`, `Sidebar.AccountAvatar` (deterministic, WCAG 4.5:1-contrast
swatches), and `Sidebar.UserAvatar`. `Sidebar.Body` fades its
overflowing edges with the `scroll-fade-y` mask (and hides its scrollbar inside the collapsed icon rail).
Also exports the `useSidebar` hook and the `SidebarState` and
`SidebarMobileBreakpoint` types. Public CSS variables: `--sidebar-width` (default `16rem`),
`--sidebar-width-mobile` (default `18rem`), and `--sidebar-width-icon` (default `3.25rem`), settable via
`Sidebar.Nav`'s `className`/`style`, plus `--sidebar-header-height` (default `4.5rem`), the header row
height that `AppLayout.Header` also derives from so the two rows stay center-aligned — set it on a common
ancestor of both. Docs: https://mantle.ngrok.com/components/navigation/sidebar
