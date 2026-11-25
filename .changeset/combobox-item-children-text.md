---
"@ngrok/mantle": minor
---

A `Combobox.Item` pick now writes the text that the item's children show into the input, not its `value`. The input is a plain text input, so it shows only that text, never the item's icons, avatars, badges, or other elements. The text skips `hidden` and `aria-hidden` parts, such as an icon or an avatar. `value` stays the value that `Combobox.Root` holds and submits, so an item can pick an ID and show a name. A preset `value` or `defaultValue`, a controlled `value` that changes, and a form reset now show the item's text too, also on the server, where the input was empty before. An item with no text to read shows its `value`. Long text stays on one line and ends with an ellipsis.

An item whose children show other text than its `value` changes: filter on the shown text, and submit the value with `name` on `Combobox.Root`, not on `Combobox.Input`. Read the [migration guide](https://mantle.ngrok.com/migrations/0034-combobox-item-text-migration).
