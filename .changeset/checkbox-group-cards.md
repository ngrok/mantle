---
"@ngrok/mantle": patch
---

`@ngrok/mantle/checkbox` now exports `CheckboxGroup`, the card variant of `Checkbox` for a "select all that apply" question. It looks like `RadioGroup.Card`, but the user can check any number of cards.

- `CheckboxGroup.Root` is a `role="group"` element that holds the checked values: `value`, `defaultValue`, and `onValueChange` take a `string[]`. With a `name`, a form submits one entry for each checked value, and a form reset returns to `defaultValue`. It also takes `disabled` and `form`.
- `CheckboxGroup.Card` is a card with a native `<input type="checkbox">` that covers it. A click anywhere on the card toggles it, each card is its own Tab stop, and a screen reader outlines the whole card and stops once on it. Links, buttons, and form controls in the card keep their own clicks. A `Choice.Title` in the card names the checkbox, and a `Choice.Description` describes it. Style its state with `has-[>input:checked]:`, `has-[>input:disabled]:`, and `has-[>input:focus-visible]:`, or with `group-has-[>input:checked]/checkbox:` from a child.
- `CheckboxGroup.Indicator` draws a check box by default. Pass your own mark, or a render-props function that receives `checked` and `disabled`.
- `CheckboxGroup.ItemContent` holds the card's title and description, and it takes `asChild`.

Each part has a `data-slot`: `checkbox-group`, `checkbox-group-card`, `checkbox-group-card-label` (the `display: contents` wrapper of the card's children), `checkbox-group-indicator`, and `checkbox-group-item-content`.

See https://mantle.ngrok.com/components/forms/checkbox#cards.
