---
"@ngrok/mantle": minor
---

Add `ThemeSwitcher` and `ThemeDropdownMenuRadioGroup` at `@ngrok/mantle/theme-switcher` — the canonical picker UI over mantle's theme system (`ThemeProvider` + `useTheme`). `ThemeSwitcher` is a compact standalone picker: a ghost `IconButton` trigger (overridable `appearance` and accessible `label` props) with an SSR-safe icon — a `Skeleton` until hydration, then `AutoThemeIcon` matching the applied theme — that opens a `DropdownMenu` of the five themes. `ThemeDropdownMenuRadioGroup` is the five-theme `DropdownMenu.RadioGroup` it hosts, embeddable in any existing menu (e.g. an account-menu `Theme` submenu) so long as it renders inside a `DropdownMenu.Content` or `DropdownMenu.SubContent`. Documented at https://mantle.ngrok.com/components/forms/theme-switcher. This consolidates the near-identical theme-switcher copies across ngrok's apps (dashboard, login, docs site) onto one shipped, tested component.
