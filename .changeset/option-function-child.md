---
"@ngrok/mantle": patch
---

`Select.Item`, `Combobox.Item`, and `MultiSelect.Item` accept a function child, `(props, { highlighted }) => element`. Use it when a highlighted row must render different content, such as a preview. Spread `props` on the element you return, and write the label inside it. The label span and the check move inside your element, as with `asChild`. Give a `Select.Item` with a function child a `textValue`: it is the label `Select.Value` shows, and without it `Select.Value` shows the `value`. Only a row with a function child re-renders when the highlight moves. To restyle the highlighted row only, keep using the `data-highlighted:` variant.
