---
"@ngrok/mantle": patch
---

Bump runtime Radix UI dependencies: `react-dialog` 1.1.21 → 1.1.23, `react-dropdown-menu` 2.1.22 → 2.1.24,
`react-hover-card` 1.1.21 → 1.1.23, `react-popover` 1.1.21 → 1.1.23, `react-progress` 1.1.14 → 1.1.16,
`react-select` 2.3.5 → 2.3.7, `react-slider` 1.4.5 → 1.4.7, `react-slot` 1.3.1 → 1.3.3,
`react-switch` 1.3.5 → 1.3.7, `react-tabs` 1.1.19 → 1.1.21, and `react-tooltip` 1.2.14 → 1.2.16.

Bump `@ariakit/react` 0.4.34 → 0.4.35, which fixes native form submission for `MultiSelect`. A `name` —
passed to `MultiSelect.Input` directly or flowed from `Field.Control` — is no longer set on the combobox
input, whose value is the typeahead filter text; it is applied to one hidden input per selected value
instead. A native form submit now sends the selected values rather than whatever the user typed. Code that
read the `name` attribute off the rendered combobox input (or queried it by name) must target the hidden
inputs instead; consumers reading selection through `selectedValue` / `setSelectedValue` are unaffected.
