---
"@ngrok/mantle": patch
---

`Select.Root`'s `onBlur` now fires when the trigger button blurs. Before this change the prop was stored and never called, so a form library's `field.handleBlur` never ran for a `Select`. It runs after any `onBlur` you pass on `Select.Trigger`.

The docs now list `Select.Item`'s `icon` prop and `Select.Content`'s `position` prop with its `"popper"` default, and the `Select.Root` and `Select.Trigger` summaries in the built types carry the same validation and `Field.Control` guidance as the docs page.
