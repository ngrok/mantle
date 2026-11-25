---
"@ngrok/mantle": patch
---

Let a modified click on a link item leave the link to the browser without a pick, in `Combobox`, `Select`, and `MultiSelect`.

A `Combobox.Item` with `asChild` around a link picked on each click. A ⌘-click, a Ctrl-click, a Shift-click, or an Alt-click leaves the link to the browser, which opens it in another tab or window or downloads it, but the pick also wrote the item's text into the input and closed the list in this tab. Now such a click picks nothing, so this tab keeps its text and its value, as a link in `Tabs` or `DataTable` does. When the browser moves focus to a new tab, the list closes as on any blur. A plain click picks as before.

Docs: https://mantle.ngrok.com/components/forms/combobox
