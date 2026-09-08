---
"@ngrok/mantle": patch
---

`Field.Item` now takes an `id` for the focusable control. `Field.Control` splats it onto the control and `Field.Label` uses it as the default `htmlFor`, so a Playwright locator or an anchor link can find the control by a stable id. When omitted, `Field.Item` generates a stable id as before. An `id` on the control element itself is still overwritten: `Field.Item` owns the control's `id`, `name`, `aria-*`, and `validation`.

Before this change, an `id` on `Field.Item` landed on its wrapping `<div>`. It now names the control, and the wrapper carries no id. This matches `Choice.Root`, whose `id` also names the control. The migration guide is at [mantle.ngrok.com/migrations/field-item-owns-control-id-migration](https://mantle.ngrok.com/migrations/field-item-owns-control-id-migration).

```tsx
<Field.Item name="password" id="login-password">
	<Field.Label>Password</Field.Label>
	<Field.Control>
		<PasswordInput autoComplete="current-password" />
	</Field.Control>
</Field.Item>
```
