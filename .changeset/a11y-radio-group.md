---
"@ngrok/mantle": patch
---

`RadioGroup` accessibility and documentation fixes.

- `RadioGroup.Item` shows a focus ring when it renders a custom `RadioGroup.Indicator` or none. Before, only the default indicator's circle drew a ring, so an item with custom children had no visible focus.
- The items no longer forward `aria-describedby` from `Field.Control`. Headless UI strips the value, so the prop was dead; the JSDoc already said the attribute does not propagate.
- `RadioGroup.Indicator` drops a `name` that `Choice.Indicator` injects for a control, so the presentational `<div>` no longer carries an invalid attribute.
- The `RadioGroup.InputSandbox` JSDoc now states what the sandbox does: a click inside it still selects the radio and focus returns to the input, and keys other than Enter and Tab stop there.
- The docs no longer claim that each item renders a real `<input type="radio">`. Each item is a `div[role="radio"]`; the group renders one hidden input for form submission when it has a `name`. The examples drop `<label htmlFor>` pairs, which cannot bind to a `div[role="radio"]`, and every standalone group carries an accessible name.
