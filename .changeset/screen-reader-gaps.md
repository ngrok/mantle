---
"@ngrok/mantle": patch
---

Screen readers announce more of what changes, and say less twice:

- `MultiSelect` says which value a removed tag held, such as "Removed apple", in a polite status.
- `ThemeSwitcher` says the theme a click applied, such as "Dark theme", in a polite status.
- `Popover.Content` takes its dialog name from its trigger. An `aria-label` or `aria-labelledby` replaces it.
- `Command.Input` is named "Search" when `Command.Root` has no `label` and the input has no name of its own.
- The tooltips of `Sidebar.Trigger` and `AppLayout.SidePanelTrigger` no longer repeat the button's name as its description.
- An arrow key in `Tabs` selects the tab before it takes focus, so NVDA reads the tab once.
- In a modal `Dialog`, `Sheet`, or `AlertDialog`, Tab and Shift+Tab reach the next field when the field that loses focus renders on blur, such as a field that clears its error.
