# Theme controls by surface

**Date:** 2026-10-23
**Status:** Accepted
**Builds on:** [2026-10-22-two-themes-and-a-two-state-toggle.md](./2026-10-22-two-themes-and-a-two-state-toggle.md), decision 5
**Supersedes:** decision 6 of [2026-10-22-two-themes-and-a-two-state-toggle.md](./2026-10-22-two-themes-and-a-two-state-toggle.md) (`ThemeDropdownMenuRadioGroup` keeps the three options)
**Applies to:** `@ngrok/mantle/theme-switcher`, `@ngrok/mantle/theme`, and every app that renders a theme control

## Context

A public site has a header, so the theme control is one `<ThemeSwitcher />` in it. An app shell is different. The dashboard, the ngrok AI dashboard, and corp have a sidebar and an account menu, not a site header. Users of an app shell look for preferences in the account menu or on a settings page.

On 2026-10-23 (frontend `7d9a6065`, mantle 0.90.4), the frontend apps did this:

- The dashboard account menu and the ngrok AI sidebar user menu each have a `Theme` submenu that holds `ThemeDropdownMenuRadioGroup`.
- The corp sidebar footer has a `Theme` row that opens a menu with `ThemeDropdownMenuRadioGroup`.
- The dashboard and corp centered layouts (sign-in, MFA, and the other signed-out pages) use the `ThemeSwitcher.Root` compound. The next minor removes that compound.
- The dashboard Preferences page has a `Display` section with a `RadioGroup` over `useTheme`. It still lists the two high-contrast themes.
- The dashboard command palette has one action for each theme.
- The ngrok AI signed-out layout has no theme control.

Each surface already uses a mantle part or `useTheme`. Nothing written says which control goes on which surface.

## Decision

### 1. Each surface gets one control

| Surface                                        | Control                                                      | Why                                                    |
| ---------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| Public site header                             | `<ThemeSwitcher />`                                          | The user wants to flip the page, in one click.         |
| App signed-out and centered pages              | `<ThemeSwitcher />` in the layout footer                     | No account menu exists before sign-in.                 |
| App account menu                               | `ThemeDropdownMenuItem` at the top level of the menu         | The menu holds the control, so the chrome stays clear. |
| App sidebar footer with no account menu (corp) | A `Theme` row that opens a menu with `ThemeDropdownMenuItem` | Same reason as the account menu.                       |
| App settings page                              | An app-owned `RadioGroup` over `useTheme`                    | The preview art belongs to the app.                    |
| App command palette                            | One action for each theme, over `useTheme`                   | The keyboard path.                                     |

A signed-in app shell shows the theme control in the account menu only. It does not also put a `ThemeSwitcher` in the shell chrome. Two controls for one preference in one view make the user ask which one wins.

### 2. The menu control is one row, not a submenu

`ThemeDropdownMenuItem` is the toggle in menu form: one "Dark mode" row with a switch. It is a `role="menuitemcheckbox"`, checked when the applied theme is dark. A choice flips the theme the same way a `ThemeSwitcher` click does, so it stores `"system"` when the new theme matches the OS preference. The menu and the toggle store the same values, and no surface shows a "System" item. `toggleTheme` in `theme-switcher.tsx` is the one code path for both.

A row goes at the top level of the menu. A submenu takes a second hover or key press, and its flyout opens beside a menu that is already narrow when the sidebar is a collapsed icon rail. One row fits the narrowest menu. It replaces `ThemeDropdownMenuRadioGroup`. The high-contrast minor already changes that export, so the same minor carries the replacement.

The menu stays open after a choice, and the new theme grows in a circle from the switch, with the same view transition as `ThemeSwitcher`. Because the menu stays open, both snapshots show it, and nothing freezes outside the circle. The switch thumb slides in 200ms. `mantle.css` exempts `[data-slot~="theme-dropdown-menu-item"]` from the rule that stops transitions during the swap, as it exempts the switcher icon.

### 3. The swap stays a view transition in `flushSync`

React `startTransition` does not fit here, because it can commit after the browser takes the new snapshot. We measured one full swap in headless Chromium on a page of 5,000 rows with a color transition: set `data-theme-transition`, change the theme class, then remove the attribute. Each value is the median of five rounds of 20 swaps, with the rules interleaved:

| Rule that stops transitions                       | Median swap |
| ------------------------------------------------- | ----------- |
| No rule                                           | 22.9ms      |
| Exempts the switcher icon                         | 23.3ms      |
| Exempts the switcher icon and the menu item (now) | 25.2ms      |

The rounds spread about 2ms, as wide as the gaps, so the rule costs about the same as the transitions it stops. It exists so that colors inside the circle do not fade while the rest of the page shows the new theme. Setting the attribute inside the view-transition update did not shorten the time to the reveal: the median time from `startViewTransition` to `ready` was 38.8ms before and 39.5ms after. The cookie write, the `localStorage` ping, and the `BroadcastChannel` message took less than 0.3ms together.

### 4. One stored preference for each site

Every control reads and writes the same `ThemeProvider` cookie through `useTheme`. On an `ngrok.com` host the cookie domain is `.ngrok.com`, so a choice in the dashboard also applies to corp and to the `ngrok.com` sites. On an `ngrok.ai` host the cookie domain is `.ngrok.ai`, so a choice in the ngrok AI dashboard on `app.ngrok.ai` also applies to `ngrok.ai`. On any other host the cookie is host-only. A cookie cannot span `ngrok.com` and `ngrok.ai`, so each site keeps its own choice.

### 5. Frontend adoption

When the frontend takes the minor that removes high contrast:

1. Run the codemod from `/migrations/0011-eliminate-high-contrast-migration`. It rewrites each `ThemeSwitcher.Root` compound in the centered layouts to `<ThemeSwitcher />`.
2. Remove the two high-contrast options from the dashboard `Display` section.
3. Add `<ThemeSwitcher />` to the footer of the ngrok AI signed-out layout, to match the dashboard sign-in page.
4. Replace each `Theme` submenu in the dashboard and ngrok AI account menus with `<ThemeDropdownMenuItem />` at the top level. In the corp footer menu, replace `ThemeDropdownMenuRadioGroup` with `ThemeDropdownMenuItem`. Update the tests that query `menuitemradio` theme items.
5. Keep the command palette actions.
