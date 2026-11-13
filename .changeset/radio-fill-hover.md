---
"@ngrok/mantle": patch
---

Restyle the radio and checkbox controls:

- `RadioGroup.Indicator`: the default circle is outlined when unchecked and filled when checked. On hover, the outline or the fill moves toward more contrast.
- `RadioGroup.ListItem` and `RadioGroup.Card`: the item changes its background on hover and when checked, like a `SelectableList` row. Hover and focus no longer change the border color. A checked `RadioGroup.Card` has a translucent accent border, like an info `Alert`.
- `RadioGroup.List`: the group has one border and an inner gap, like `SelectableList`. Each item is a rounded row with no border.
- `RadioGroup.ButtonGroup` and `RadioGroup.Button`: the group is a dim track with no border. The checked button is a raised card surface with a shadow. `RadioGroup.ButtonGroup` sets the 36px height, not each `RadioGroup.Button`.
- `Checkbox`: the check and the indeterminate mark are white in dark mode.

See https://mantle.ngrok.com/components/forms/radio-group and https://mantle.ngrok.com/components/forms/checkbox.
