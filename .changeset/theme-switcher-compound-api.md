---
"@ngrok/mantle": patch
---

**Breaking:** `ThemeSwitcher` is now a compound component — compose `ThemeSwitcher.Root`, `ThemeSwitcher.Trigger`, and `ThemeSwitcher.Content` instead of rendering a single `<ThemeSwitcher />`. The `contentProps` prop bag is gone: pass `DropdownMenu.Content` props (`align`, `side`, `collisionPadding`, `className`, …) directly to `ThemeSwitcher.Content`, and `IconButton` props (`appearance`, `label`, `className`, …) directly to `ThemeSwitcher.Trigger`. `ThemeSwitcher.Content` renders `ThemeDropdownMenuRadioGroup` when no children are given; pass children to own the menu contents. `ThemeSwitcherProps` is replaced by `ThemeSwitcherRootProps`, `ThemeSwitcherTriggerProps`, and `ThemeSwitcherContentProps`; `ThemeDropdownMenuRadioGroup` is unchanged. The trigger's `data-slot` is now `theme-switcher-trigger` (was `theme-switcher`) and the popover's is `theme-switcher-content dropdown-menu-content` — `DropdownMenu.Content` now joins an incoming `data-slot` chain ahead of its own slot name instead of being clobbered by it, so `[data-slot~="dropdown-menu-content"]` selectors keep matching wrapped menus.

Migration:

```tsx
// before
<ThemeSwitcher contentProps={{ className: "shadow-2xl", collisionPadding: { right: 16 } }} />

// after
<ThemeSwitcher.Root>
	<ThemeSwitcher.Trigger />
	<ThemeSwitcher.Content className="shadow-2xl" collisionPadding={{ right: 16 }} />
</ThemeSwitcher.Root>
```
