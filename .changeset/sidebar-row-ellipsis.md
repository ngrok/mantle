---
"@ngrok/mantle": patch
---

`Sidebar.ItemButton` ends a long name in an ellipsis. Before, a row with an icon cut its name off mid-word. The row now wraps each run of its text in a `<span data-slot="sidebar-item-button-label">`, also under `asChild`. The wrapper also keeps a translated page from crashing when an icon mounts before the row's name.
