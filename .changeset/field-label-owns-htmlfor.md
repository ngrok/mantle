---
"@ngrok/mantle": patch
---

`Field.Label` no longer takes `htmlFor`, and `Field.Control` no longer takes `id`. `Field.Item` owns the control id: its `id` prop names the control, `Field.Control` splats it onto the focusable child, and `Field.Label` always points its `htmlFor` at it. A label and its control can no longer drift apart. Outside a `Field.Item`, `Field.Label` renders a `<label>` with no `for` attribute; use `Label` from `@ngrok/mantle/label` there.

Migration: delete every `htmlFor` on `Field.Label` and every `id` on `Field.Control`. Move a literal id that must stay stable to `id` on the surrounding `Field.Item`. The full guide, with before and after examples, is at [mantle.ngrok.com/migrations/field-item-owns-control-id-migration](https://mantle.ngrok.com/migrations/field-item-owns-control-id-migration).
