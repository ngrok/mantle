---
"@ngrok/mantle": patch
---

`Sidebar` adds collapsible groups: `Sidebar.Disclosure`, `Sidebar.DisclosureTrigger`, and `Sidebar.DisclosureList`. In the expanded sidebar and the mobile sheet, a group folds its rows in place. In the collapsed sidebar, the group's icon opens the same rows as a flyout beside it, on a click, a tap, Enter, or Space, and after a short hover with a mouse. The rows are links in the page's tab order, not a menu. A row that becomes `current` opens its group, and a closed group that holds the current page shows the current-row fill.

A float from `useFloat` that loses its `popover` attribute while it is open no longer throws when it closes. An open native `<dialog>` inside a float now takes its own Escape.

The ⌘B / Ctrl+B sidebar chord does nothing while another modal dialog is open, because the page under the modal is inert.
