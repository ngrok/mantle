---
"@ngrok/mantle": patch
---

A `Choice.Description` inside a `RadioGroup` item is now the radio's `aria-describedby`, and the `Choice.Title` alone is its accessible name.

`role="radio"` flattens its children, so before this change a `Choice.Title` and `Choice.Description` inside a radio merged into one name, such as "Free Up to 3 projects and 1 member." Now `Choice.Title` and `Choice.Description` register their ids with the radio item, which points `aria-labelledby` at the title and `aria-describedby` at the description. This works in every item variant: `RadioGroup.Item`, `RadioGroup.ListItem`, `RadioGroup.Card`, and `RadioGroup.Button`. A `Choice` next to a checkbox or a switch is unchanged, and `Choice.Title` now carries an `id`, which defaults to a generated one.

The same change lets a radio item inside `Field.Control` pick up the field's `aria-describedby`, so `Field.Description` and `Field.Errors` now describe each radio in that composition. Before, Headless UI's `Radio` wrote its own empty `aria-describedby` over the value, and the docs said the attribute did not propagate. Each item variant now renders its own element through Headless UI's `as` prop and stamps the ids after that spread. See [Rich option layout with Choice](https://mantle.ngrok.com/components/forms/radio-group#rich-option-layout-with-choice).
