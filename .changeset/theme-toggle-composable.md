---
"@ngrok/mantle": patch
---

Add `ThemeSwitcherIcon` and `useThemeToggle` to `@ngrok/mantle/theme-switcher`, and let `ThemeDropdownMenuItem` take `children`. You can now put the theme toggle icon where you want it in a menu row, such as first, to line up with the icons of other rows.

- `ThemeDropdownMenuItem` takes `children` in place of its default row. Put a `ThemeSwitcherIcon` where the icon goes. With no `children`, the item renders the same row as before.
- `ThemeSwitcherIcon` is the `ThemeSwitcher` icon on its own: a sun or a moon for the applied theme, in a `<span data-slot="theme-switcher-icon">`. The new theme grows in a circle from it.
- `useThemeToggle` returns `disabled`, `label`, and `onSelect` for a `DropdownMenu.Item` that you compose yourself. A press flips the theme and keeps the menu open.

```tsx
<ThemeDropdownMenuItem>
	<ThemeSwitcherIcon />
	Theme
</ThemeDropdownMenuItem>
```

See https://mantle.ngrok.com/components/forms/theme-switcher#laying-out-the-row.
