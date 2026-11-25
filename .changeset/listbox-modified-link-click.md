---
"@ngrok/mantle": patch
---

Let a modified click on a link item open the link elsewhere without a pick, in `Combobox`, `Select`, and `MultiSelect`.

A `Combobox.Item` with `asChild` around a link picked on each click. A ⌘-click, a Ctrl-click, a Shift-click, or an Alt-click opens the link in another tab or window, but the pick also wrote the item's text into the input and closed the list in this tab. Now such a click only opens the link, and this tab keeps its text, its value, and its open list, as a link in `Tabs` or `DataTable` does. A plain click picks as before.

Docs: https://mantle.ngrok.com/components/forms/combobox
