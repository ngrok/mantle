---
"@ngrok/mantle": patch
---

Restyle the radio and checkbox controls:

- `RadioGroup.Indicator`: the default circle is a filled circle with no border. On hover, the fill moves toward more contrast.
- `RadioGroup.ListItem`, `RadioGroup.Card`, and `RadioGroup.Button`: the item changes its background on hover and when checked, like a `SelectableList` row. Hover, focus, and selection no longer change the border color.
- `RadioGroup.List` and `RadioGroup.ButtonGroup`: the group has one border and an inner gap, like `SelectableList`. Each item is a rounded row with no border. `RadioGroup.ButtonGroup` sets the 36px height, not each `RadioGroup.Button`.
- `Checkbox`: the check and the indeterminate mark are white in dark mode.

See https://mantle.ngrok.com/components/forms/radio-group and https://mantle.ngrok.com/components/forms/checkbox.
