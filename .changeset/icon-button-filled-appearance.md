---
"@ngrok/mantle": patch
---

`IconButton` gains the `filled` appearance, so it now draws every `appearance` and `intent` pair that `Button`
draws, without `link`.

Before this, `IconButton` stopped at `ghost` and `outlined`. A primary action that happened to be icon-only had
no way to carry the weight its text-labelled sibling carried, so call sites either dropped to `outlined` or
hand-rolled the fill. `filled` closes that: `appearance="filled" intent="neutral"` is the same solid box on both
components, and `intent="accent"` and `intent="danger"` fill with the same tokens `Button` fills with.

`link` stays off the union. An icon-only link has no text to read as a link.

One shared pair also drifted between the two components. `Button`'s `outlined` + `neutral` kept its accent border
while focused and hovered, but dropped back to the resting border the moment the button was pressed;
`IconButton` held the accent border through the press. `Button` now holds it too, so a focused button and a
focused icon button draw the same border for the whole click.

```tsx
<IconButton appearance="filled" intent="neutral" icon={<PlusIcon />} label="Create endpoint" />
<IconButton appearance="filled" intent="danger" icon={<TrashIcon />} label="Delete endpoint" />
```
