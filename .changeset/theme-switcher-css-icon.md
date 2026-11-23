---
"@ngrok/mantle": patch
---

`ThemeSwitcher` and `ThemeSwitcherIcon` show the right icon from the first paint, with no `Skeleton` placeholder. CSS picks the sun or the moon from the theme class on `<html>`, which `PreventWrongThemeFlashScript` and `ThemeProvider` set before paint. The server HTML is the same for every stored theme, hydration needs no second render, and a theme or OS change renders nothing. The switcher keeps no media query list of its own.

The server HTML takes the default accessible name of `ThemeSwitcher` ("Switch to dark theme", "Switch to light theme (system default)", and so on) from CSS generated content, so the name is correct before hydration and with no JavaScript, and the page text stays free of it. After mount, an `aria-label` holds the same name and follows the theme with no render, so a test in jsdom or happy-dom finds the switcher with `getByRole("button", { name: "Switch to dark theme" })`. A `label` still sets `aria-label`.

The new `root-dark:` variant matches when the root paints dark, with the same selector as the dark theme block. Unlike `dark:`, a `.dark` class on another ancestor does not match it.

See https://mantle.ngrok.com/components/forms/theme-switcher.
