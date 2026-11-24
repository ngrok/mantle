---
"@ngrok/mantle": patch
---

A `Combobox.Item` pick now writes the text that the item's children show into the input, not its `value`. The text skips `aria-hidden` parts, such as an icon or an avatar. `value` stays the value that `Combobox.Root` holds and submits, so an item can pick an ID and show a name. A preset `value` or `defaultValue`, and a form reset, now show the item's text too, also on the server, where the input was empty before.

- Filter on the text, because the input holds it after a pick.
- A function child, or an item that a component of your own renders, shows its `value`. To show other text, control `inputValue`.
- Long text stays on one line and ends with an ellipsis.

Docs: https://mantle.ngrok.com/components/forms/combobox#the-text-a-pick-writes
