---
"@ngrok/mantle": minor
---

`RadioGroup` and `SegmentedControl` use native `<input type="radio">` elements and no longer depend on Headless UI. Each item (`RadioGroup.Item`, `RadioGroup.ListItem`, `RadioGroup.Card`, and `SegmentedControl.Item`) is a `<div>` with an invisible radio that covers it, and a click anywhere on the item checks the radio. The browser owns the one tab stop, Space, and form submission, and the value follows a choice that the browser restores. The root moves the arrow keys itself, so they wrap at either end and swap in right-to-left text in every browser. The accessibility tree, the item markup, and the look do not change, and the HTML stays valid with any content in an item. In Safari, Tab reaches a radio only with "Press Tab to highlight each item" or Option-Tab, as for every native control. The `RadioGroup` entry is about 8.6 KB smaller (gzip), and Headless UI's patch of `HTMLElement.prototype.focus` and its document listeners are gone.

Breaking changes:

- `RadioGroup.Root`, `RadioGroup.List`, and `SegmentedControl.Root` report the value with `onValueChange(value)`, the same name as `Select`. `onChange` on a root is now the DOM `change` event. The codemod renames it.
- The radio inside an item carries the state, so a class on an item that reads `aria-checked:`, `aria-disabled:`, or `focus-visible:` no longer matches. Use `has-[>input:checked]:`, `has-[>input:disabled]:`, and `has-[>input:focus-visible]:`. From a child of the item, use `group-has-[>input:checked]/radio:`.
- Items no longer emit `data-checked`, `data-focus`, `data-hover`, `data-disabled`, or `data-headlessui-state`.
- `RadioGroup.Indicator` render props receive `checked` and `disabled` only. Style hover and keyboard focus with `group-hover/radio:` and `group-has-[>input:focus-visible]/radio:`.
- Radio items no longer take `as`, and the roots no longer take `by`. The codemod removes them.
- `RadioGroup.InputSandbox` no longer stops key presses: the nested input has focus, so typing never moves the selection. Its `onClick` runs before it checks the radio, and `event.preventDefault()` keeps the radio unchecked.
- In tests, `getByRole("radio")` returns the `<input>`. Read the item with `radio.parentElement`.
- `RadioGroup.Indicator` renders a `<span>`, so it is valid inside `Choice.Indicator`.

New: `RadioGroup.Root` and `SegmentedControl.Root` take `required` and pass `form` to each radio. Both need a `name`. A `<label htmlFor>` with the item's `id`, or `Choice.Label`, can be the title line that names the radio.

Migration guide: https://mantle.ngrok.com/migrations/0021-native-radio-group-migration
