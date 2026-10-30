---
"@ngrok/mantle": patch
---

Restyle the radio and checkbox controls:

- `RadioGroup.Indicator`: the default circle is a filled circle with no border. On hover, the fill moves toward more contrast. The checked dot is white in both themes.
- `RadioGroup.ListItem`, `RadioGroup.Card`, and `RadioGroup.Button`: on hover, the item changes its background, like a `SelectableList` row. The border no longer changes color on hover.
- `Checkbox`: the check and the indeterminate mark are white in dark mode.

See https://mantle.ngrok.com/components/forms/radio-group and https://mantle.ngrok.com/components/forms/checkbox.
