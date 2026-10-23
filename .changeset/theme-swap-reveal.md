---
"@ngrok/mantle": patch
---

`ThemeSwitcher` animates the theme swap. The new theme grows in a circle from the button in a 400ms view transition, so every color changes in the same frame. Color transitions stop until the swap ends. Under `prefers-reduced-motion: reduce`, or in a browser without view transitions, the swap happens at once.

The reveal is part of `setTheme` from `useTheme`, so every theme change in an app runs it, such as a command palette action or a settings page. `setTheme` takes a second argument, `{ origin }`, the element the circle grows from. When it is omitted, the circle grows from the focused element, else from the center of the viewport. `setTheme` also takes an updater, `(theme) => next`, that reads the latest theme when two presses come before the first swap runs. A dialog overlay or a dropdown menu that closes as the swap starts leaves at once, so it does not freeze outside the circle. The new `SetThemeOptions` type describes the options.
