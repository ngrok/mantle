# Two themes, and a theme toggle with two visible states

**Date:** 2026-10-22
**Status:** Accepted; decision 6 superseded by [2026-10-23-theme-controls-by-surface.md](./2026-10-23-theme-controls-by-surface.md); the follow-up in decision 4 shipped in [2026-10-25-light-dark-tokens.md](./2026-10-25-light-dark-tokens.md)
**Supersedes:** decision 1 of [2026-07-15-theme-switcher-compound-api.md](./2026-07-15-theme-switcher-compound-api.md) (`ThemeSwitcher` is a `Root`/`Trigger`/`Content` compound). Its rule against prop-bag passthrough props stays in force.
**Tracks:** MNTL-59

## Context

Mantle shipped four resolved themes: light, dark, light-high-contrast, and dark-high-contrast. Each high-contrast theme was a full stylesheet of its own ramps, chart slots, and gates. Each new token had to land in four files, and the chart gates ran their measurements four times. An OS `prefers-contrast: more` setting also switched every "system" user into a high-contrast theme.

The theme script and `MantleStyleSheets` carried most of that weight. The flash script read two media queries, migrated a legacy `localStorage` key, and seeded a cookie. `MantleStyleSheets` rendered three gated `<link>` tags, an inline script to fix their `media` attributes, and a `MutationObserver`. With light and dark only, the dark sheet is applied on every page that has a resolved theme, because an `invert-theme` island on a light page paints in dark. The `media` gate then never saves a request.

The five-item theme menu also asked users a question they rarely have. Lea Verou's [post on dark mode toggles](https://lea.verou.me/blog/2026/dark-mode-toggles/) argues that a user at a toggle has one goal, which is to flip the page. The data model needs three states, but the control needs to show only two.

## Decision

1. **Mantle has two themes.** `Theme` is `"system" | "light" | "dark"` and `ResolvedTheme` is `"light" | "dark"`. The high-contrast stylesheets, their package exports, and the `high-contrast:` and `dark-high-contrast:` variants are deleted. `"system"` follows `prefers-color-scheme` alone.
2. **A stored high-contrast preference keeps its base theme.** One map, `themeByCookieValue`, reads `light-high-contrast` as `light` and `dark-high-contrast` as `dark`. The flash script receives the same map as an argument, so the server, the script, and the provider agree. `ThemeProvider` rewrites the cookie on mount, so every app on the `.ngrok.com` cookie domain sees the base theme. A cross-tab message re-reads the cookie and ignores its payload, so a tab on an older mantle cannot apply a retired theme.
3. **The flash script writes no cookie.** A missing cookie already means `"system"`, so seeding it changed nothing. The legacy `localStorage` migration is a year old and is gone. The script reads the cookie, resolves the theme, and writes the class and the two data attributes.
4. **`MantleStyleSheets` renders one ungated `<link>`.** `fixMediaScriptContent` and the `forceTheme`, `ssrCookie`, and `nonce` props are deleted. A follow-up can fold `mantle-dark.css` into `mantle.css`; that is a change to the CSS performance decision, so it is out of scope here.
5. **`ThemeSwitcher` is one toggle button.** A click shows the opposite of the applied theme. When that opposite matches the OS setting, the click stores `"system"`, so a second click always returns to the OS default. A change to the OS setting never clears a stored override. The pure core is `getToggledTheme` in `themes.ts`, which stays internal.
6. **`ThemeDropdownMenuRadioGroup` keeps the three options.** A settings panel or an account menu is where a user expects to configure a preference, and the post names settings panels as the place for a tri-state control.
7. **The bump is `minor`.** Mantle is `0.x`. The guide at `/migrations/0011-eliminate-high-contrast-migration` and its codemod carry the steps.
