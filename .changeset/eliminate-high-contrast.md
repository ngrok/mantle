---
"@ngrok/mantle": minor
---

Remove the high-contrast themes, simplify the theme script, and make `ThemeSwitcher` a light/dark toggle. See the [migration guide](https://mantle.ngrok.com/migrations/0011-eliminate-high-contrast-migration); its codemod rewrites most call sites.

- **Two themes.** `Theme` is `"system" | "light" | "dark"`, and `ResolvedTheme` is `"light" | "dark"`. The `@ngrok/mantle/mantle-light-high-contrast.css` and `@ngrok/mantle/mantle-dark-high-contrast.css` exports and the `high-contrast:` and `dark-high-contrast:` variants are gone. `"system"` follows `prefers-color-scheme` only; `prefers-contrast` no longer changes the theme.
- **A stored high-contrast preference degrades.** A `light-high-contrast` cookie reads as `light` and a `dark-high-contrast` cookie reads as `dark`. `ThemeProvider` rewrites the cookie on mount.
- **Smaller theme script.** `PreventWrongThemeFlashScript` reads the cookie and sets the theme class. It no longer writes a cookie or reads the legacy `localStorage` key.
- **`MantleStyleSheets` renders one `<link>`.** It takes `darkCssUrl` only, and `mantleStyleSheetUrls` takes `{ darkCssUrl }`. The `lightHighContrastCssUrl`, `darkHighContrastCssUrl`, `forceTheme`, `ssrCookie`, and `nonce` props and the `fixMediaScriptContent` export are gone.
- **`ThemeSwitcher` is a toggle.** `<ThemeSwitcher />` replaces `ThemeSwitcher.Root`, `ThemeSwitcher.Trigger`, and `ThemeSwitcher.Content`. A click flips between light and dark. A click back to the OS setting stores `"system"`, so a second click always returns to the OS default. Its accessible name says which theme the click shows. `ThemeSwitcherProps` replaces the three part prop types.
- **`ThemeDropdownMenuItem` replaces `ThemeDropdownMenuRadioGroup`.** It is the toggle in menu form: one "Theme" row that ends in the `ThemeSwitcher` icon. Put it at the top level of an account menu, with no submenu. A press flips light and dark the same way a `ThemeSwitcher` click does, and the "System Preference" option is gone. The menu stays open, and the new theme grows in a circle from the icon. Under `forceTheme`, the item is disabled. `ThemeDropdownMenuItemProps` replaces `ThemeDropdownMenuRadioGroupProps`, and a `label` prop replaces `aria-label` and `aria-labelledby`.
- **A forced page disables the toggle.** Under a `ThemeProvider` with `forceTheme`, `useAppliedTheme` returns the forced theme, and `ThemeSwitcher` shows that theme and is disabled. A click there changed only a preference the page did not show.
