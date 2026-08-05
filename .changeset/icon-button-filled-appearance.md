---
"@ngrok/mantle": patch
---

`IconButton` gains the `filled` appearance, and narrows `intent` to `"neutral"`.

Before this, `IconButton` stopped at `ghost` and `outlined`. A primary action that happened to be icon-only had
no way to carry the weight its text-labelled sibling carried, so call sites either dropped to `outlined` or
hand-rolled the fill. `filled` closes that: `appearance="filled" intent="neutral"` is the same solid box on both
components.

`intent` now takes `"neutral"` alone. An icon carries no text to name the action a tone colors, so an accent or
danger icon button reads as decoration rather than as a warning. `intent="accent"` and `intent="danger"` are a
type error on `IconButton` and on the wrappers that forward the prop — `Dialog.CloseIconButton`,
`Sheet.CloseIconButton`, `Field.HelpTrigger`, `DataTable.ExpandButton`, and `Sidebar.Trigger`. Reach for `Button`
where the tone carries meaning. The prop stays required, so a call site reads the same on both components, and a
later widening costs no second break. `data-intent` is still stamped, always `"neutral"`.

`link` stays off the appearance union. An icon-only link has no text to read as a link.

One shared pair also drifted between the two components. `Button`'s `outlined` + `neutral` kept its accent border
while focused and hovered, but dropped back to the resting border the moment the button was pressed;
`IconButton` held the accent border through the press. `Button` now holds it too, so a focused button and a
focused icon button draw the same border for the whole click.

```tsx
<IconButton appearance="filled" intent="neutral" icon={<PlusIcon />} label="Create endpoint" />
<IconButton appearance="ghost" intent="neutral" icon={<TrashIcon />} label="Delete endpoint" />
```
