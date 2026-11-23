---
"@ngrok/mantle": patch
---

Screen readers announce more of what changes, and say less twice:

- `MultiSelect` says which value a removed tag held, such as "Removed apple", in a polite status. It says nothing when a controlled `value` keeps the tag.
- `ThemeSwitcher` says the theme a click applied, such as "Dark theme", in a polite status.
- `Popover.Content` takes its dialog name from its trigger when it opens. An `aria-label` or `aria-labelledby` replaces it.
- `Command.Input` is named "Search" when it has no other name: no `label`, `aria-label`, `aria-labelledby`, `<label>`, `title`, or `placeholder`.
- The tooltips of `Sidebar.Trigger` and `AppLayout.SidePanelTrigger` no longer repeat the button's name as its description.
- An arrow key in `Tabs` selects the tab before it takes focus, so NVDA reads the tab once. A tab's `onFocus` that calls `preventDefault()` no longer stops that selection. To stop an arrow key, call `preventDefault()` in the `onKeyDown` of the tab that has focus.
- In a modal `Dialog`, `Sheet`, or `AlertDialog`, Tab and Shift+Tab reach the next field when the field that loses focus renders on blur, such as a field that clears its error.
