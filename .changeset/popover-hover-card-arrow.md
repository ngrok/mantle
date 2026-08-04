---
"@ngrok/mantle": patch
---

`Popover` and `HoverCard` now export an `Arrow` part — a tip that points from the content at what it is anchored
to. Render it as a child of the content:

```tsx
import { Button } from "@ngrok/mantle/button";
import { Popover } from "@ngrok/mantle/popover";

<Popover.Root>
	<Popover.Anchor asChild>
		<button type="button">Anchor</button>
	</Popover.Anchor>
	<Popover.Trigger asChild>
		<Button type="button" appearance="outlined" intent="neutral">
			What moved?
		</Button>
	</Popover.Trigger>
	<Popover.Content side="right">
		<Popover.Arrow />
		<p>Products moved up here.</p>
	</Popover.Content>
</Popover.Root>;
```

Radix positions the part with floating-ui's arrow middleware, so the tip stays centered on the anchor when
collision detection shifts or flips the content. A hand-rolled tip is a fixed offset, so it drifts off the anchor as soon as the
content moves, and it needs a pinned `align` per anchor to land on the right row at all.

Mantle styles the tip to read as a continuation of the content's edge. `Popover.Content` and
`HoverCard.Content` both paint a `bg-popover` fill behind a `border-popover` edge, and Radix renders the arrow
as an `svg`, where `bg-*` paints nothing. Each arrow is therefore two layers: a polygon filled with the popover
surface, and a polyline that strokes the two slanted edges only. The base carries no stroke and sits 1px inside
the content, so the fill covers the content's own border across the base and the two border lines read as one.

The tip carries its own shadow, built from the same `--shadow-color` and `--shadow-first-opacity` tokens the
content's `shadow-md` uses. `box-shadow` stops at the content's border, so a tip without one reads as pasted on.
A `clip-path` trims that shadow at the base, because the arrow paints above the content and the shadow would
otherwise darken the content's interior. It is one wide, faint layer, matching what the content's shadow leaves
along the edge the tip grows out of — a tighter layer muddies a shape this small. The offsets are symmetric,
since Radix rotates the arrow's wrapper per side and an offset shadow would swing with it.

`Popover.Content` and `HoverCard.Content` now set `position: relative`. The arrow's wrapper is absolutely
positioned, and the open animation's `scale` made the content that wrapper's containing block for the length of
the animation and no longer — which moved the arrow 1px the moment the animation ended. Positioning the content
keeps the containing block the same before, during, and after. Two side effects a consumer can observe: an
absolutely-positioned child of the content now anchors to the content, and the content's `z-50` now applies to
the content itself rather than only being read off it, so the content is a stacking context.

The border stroke is 1.5px against the content's 1px border. Antialiasing spreads a diagonal hairline across
two device rows at partial coverage, so a geometric 1px reads thinner than the content's axis-aligned edge.
Measured against that edge at both 1x and 2x, 1.5 is the width that matches it.

`data-slot` is `popover-arrow` and `hover-card-arrow`. `width` defaults to `14` and `height` to `7`; Radix adds
the measured height to `sideOffset`, so the tip lands `sideOffset` pixels from the anchor. Neither part takes
`asChild`, because a swapped element loses the two-layer shape — restyle with `className` (`fill-*` for the
surface, and target the `polyline` child for the edge), remembering that the part already sets `filter` and
`clip-path`.

`Tooltip` needs no new part: `Tooltip.Content` already renders its own arrow.
