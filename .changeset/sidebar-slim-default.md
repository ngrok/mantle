---
"@ngrok/mantle": patch
---

`Sidebar` ships a narrower default expanded panel: `--sidebar-width` is now `13rem` (208px), down from `16rem` (256px). `--sidebar-row-width` follows to `12rem` (192px), so menus floored at that token stay flush with a row.

Override `--sidebar-width` (on `Sidebar.Nav` or at `:root`) if you want the previous width back. See https://mantle.ngrok.com/components/navigation/sidebar#width.
