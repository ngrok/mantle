# Theme controls by surface

**Date:** 2026-10-23
**Status:** Accepted
**Builds on:** [2026-10-22-two-themes-and-a-two-state-toggle.md](./2026-10-22-two-themes-and-a-two-state-toggle.md), decisions 5 and 6
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

| Surface                                        | Control                                                    | Why                                                                |
| ---------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| Public site header                             | `<ThemeSwitcher />`                                        | The user wants to flip the page, in one click.                     |
| App signed-out and centered pages              | `<ThemeSwitcher />` in the layout footer                   | No account menu exists before sign-in.                             |
| App account menu                               | A `Theme` submenu that holds `ThemeDropdownMenuRadioGroup` | The user configures a preference there, so all three options show. |
| App sidebar footer with no account menu (corp) | A `Theme` row that opens `ThemeDropdownMenuRadioGroup`     | Same reason as the account menu.                                   |
| App settings page                              | An app-owned `RadioGroup` over `useTheme`                  | The preview art belongs to the app.                                |
| App command palette                            | One action for each theme, over `useTheme`                 | The keyboard path.                                                 |

A signed-in app shell shows the theme control in the account menu only. It does not also put a `ThemeSwitcher` in the shell chrome. Two controls for one preference in one view make the user ask which one wins.

### 2. Mantle adds no submenu part

The `Theme` submenu is four lines of `DropdownMenu` composition at the call site. Two call sites use that shape (the dashboard and the ngrok AI dashboard). Corp opens the radio group from a top-level menu, so its shape is different. [CONVENTIONS.md § Abstractions & Duplication](../CONVENTIONS.md#abstractions--duplication) asks for three uses with the same shape before an extraction. Make a part only when a third app shell adds the same submenu.

The `SubTrigger` icon can follow the theme. Radix mounts menu content only while the menu is open, which is after hydration, so a theme-aware icon there cannot cause a hydration mismatch.

### 3. One stored preference

Every control reads and writes the same `ThemeProvider` cookie through `useTheme`. On a `ngrok.com` host the cookie domain is `.ngrok.com`, so a choice in the dashboard also applies to corp and to the `ngrok.com` sites. On any other host the cookie is host-only. The ngrok AI dashboard runs on `app.ngrok.ai`, so it does not share its choice with `ngrok.ai`. A follow-up can set `domain=.ngrok.ai` on `ngrok.ai` hosts. A cookie cannot span `ngrok.com` and `ngrok.ai`.

### 4. Frontend adoption

When the frontend takes the minor that removes high contrast:

1. Run the codemod from `/migrations/0011-eliminate-high-contrast-migration`. It rewrites each `ThemeSwitcher.Root` compound in the centered layouts to `<ThemeSwitcher />`.
2. Remove the two high-contrast options from the dashboard `Display` section.
3. Add `<ThemeSwitcher />` to the footer of the ngrok AI signed-out layout, to match the dashboard sign-in page.
4. Keep the account-menu submenus, the corp footer row, and the command palette actions. Update the comments that say "five-theme radio group".
