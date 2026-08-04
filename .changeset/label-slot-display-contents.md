---
"@ngrok/mantle": patch
---

`Button` and `Badge` render their label slot with `display: contents`, so the wrapper 0.83.3 added changes no
layout.

That release wrapped `children` in a `<span data-slot="button-label">` to keep a browser translation engine
from crashing the page. The span was also a box, which made every child one flex item: a call site that passed
more than one child lost the container's `gap` between them, and a `min-width` on a child lost the formatting
context that held it. `Alert.ExpandButton` rendered `+3more` instead of `+3 more ⌄`.

The span now generates no box. Every child is a flex item of the button or the badge again, the `gap` falls
between them, and a child's own width applies — the layout matches the release before the wrapper. The span
stays in the DOM, so the crash fix stands: an icon's `insertBefore` still names an element, never a text node
the engine reparented.

This restores the shape a chip or a picker trigger needs, where the label absorbs the slack between two icons:

```tsx
<Button
	appearance="outlined"
	intent="neutral"
	className="max-w-48 min-w-0 justify-start"
	icon={<KeyIcon />}
>
	<span className="min-w-0 flex-1 truncate text-left">{selectedLabel}</span>
	<CaretDownIcon />
</Button>;
```

`flex-1` and `min-w-0` reach that span only while it is a flex item of the button, so the wrapper's box dropped
both and the label pushed past `max-w-48` instead of clamping.

`Anchor` is unchanged. Its label span never changed layout, because an anchor lays its children out in inline
flow.
