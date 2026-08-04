"use client";

import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import type { ComponentProps } from "react";
import { cx } from "../../utils/cx/cx.js";

/**
 * A floating card that appears when a user hovers over a trigger element.
 * This is the root, stateful component that manages the open/closed state of the hover card.
 *
 * `HoverCard.Content` renders at Tailwind `z-50`, Mantle's shared floating
 * z-index. When multiple shared layers are open, the most recently mounted
 * layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardroot
 *
 * @example
 * ```tsx
 * <HoverCard.Root>
 *   <HoverCard.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Hover me
 *     </Button>
 *   </HoverCard.Trigger>
 *   <HoverCard.Content>
 *     <p>This is the hover card content.</p>
 *   </HoverCard.Content>
 * </HoverCard.Root>
 * ```
 */
const Root = ({
	closeDelay = 300,
	openDelay = 100,
	...props
}: ComponentProps<typeof HoverCardPrimitive.Root>) => (
	<HoverCardPrimitive.Root closeDelay={closeDelay} openDelay={openDelay} {...props} />
);

/**
 * The trigger element that opens the hover card when hovered.
 *
 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardtrigger
 *
 * @example
 * ```tsx
 * <HoverCard.Root>
 *   <HoverCard.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Hover me
 *     </Button>
 *   </HoverCard.Trigger>
 *   <HoverCard.Content>
 *     <p>This is the hover card content.</p>
 *   </HoverCard.Content>
 * </HoverCard.Root>
 * ```
 */
const Trigger = (props: ComponentProps<typeof HoverCardPrimitive.Trigger>) => (
	<HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
);

/**
 * The portal container for rendering hover card content outside the normal DOM tree.
 * `HoverCard.Content` already renders inside this portal internally, so you typically
 * do not need to use `HoverCard.Portal` directly. Use it only when you need to
 * customize portal placement (e.g., pass a `container` prop) or wrap multiple
 * `HoverCard.Content` instances in a shared portal.
 *
 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardportal
 *
 * @example
 * ```tsx
 * <HoverCard.Root>
 *   <HoverCard.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Hover me
 *     </Button>
 *   </HoverCard.Trigger>
 *   <HoverCard.Portal>
 *     <HoverCard.Content>
 *       <p>This is the hover card content.</p>
 *     </HoverCard.Content>
 *   </HoverCard.Portal>
 * </HoverCard.Root>
 * ```
 */
const Portal = HoverCardPrimitive.Portal;

/**
 * The content to render inside the hover card.
 *
 * `HoverCard.Content` renders at Tailwind `z-50`, Mantle's shared floating
 * z-index. When multiple shared layers are open, the most recently mounted
 * layer renders on top.
 *
 * It sets `position: relative`, so `HoverCard.Arrow`'s absolutely-positioned
 * wrapper keeps one containing block through the open animation. An
 * absolutely-positioned child of the content therefore anchors to the content.
 *
 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardcontent
 *
 * @example
 * ```tsx
 * <HoverCard.Root>
 *   <HoverCard.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Hover me
 *     </Button>
 *   </HoverCard.Trigger>
 *   <HoverCard.Content>
 *     <p>This is the hover card content.</p>
 *   </HoverCard.Content>
 * </HoverCard.Root>
 * ```
 */
const Content = ({
	className,
	onClick,
	align = "center",
	sideOffset = 4,
	...props
}: ComponentProps<typeof HoverCardPrimitive.Content>) => (
	<Portal>
		<HoverCardPrimitive.Content
			data-slot="hover-card-content"
			align={align}
			sideOffset={sideOffset}
			className={cx(
				// Why relative: `HoverCard.Arrow`'s wrapper is absolutely positioned, and
				// the open animation's `scale` makes this element its containing block for
				// one frame — then drops it, moving the arrow 1px. Positioning this element
				// keeps that containing block the same before, during, and after.
				"relative",
				"bg-popover border-popover z-50 w-64 rounded-md border p-4 shadow-md outline-hidden",
				"data-state-open:animate-in data-state-closed:animate-out data-state-closed:fade-out-0 data-state-open:fade-in-0 data-state-closed:zoom-out-95 data-state-open:zoom-in-95 data-side-bottom:slide-in-from-top-2 data-side-left:slide-in-from-right-2 data-side-right:slide-in-from-left-2 data-side-top:slide-in-from-bottom-2",
				className,
			)}
			onClick={(event) => {
				/**
				 * Prevent the click event from propagating up to parent/containing elements
				 */
				event.stopPropagation();
				onClick?.(event);
			}}
			{...props}
		/>
	</Portal>
);

type HoverCardArrowProps = Omit<
	ComponentProps<typeof HoverCardPrimitive.Arrow>,
	"asChild" | "children"
>;

/**
 * An optional tip that points from `HoverCard.Content` at its trigger. Render it
 * as a child of `HoverCard.Content`. Radix positions it with floating-ui's arrow
 * middleware, so it stays centered on the trigger when collision detection shifts
 * or flips the content. It also repaints `HoverCard.Content`'s fill and border
 * across its base, so the two edges read as one line, and carries its own shadow,
 * clipped at that base so it never darkens the content's interior.
 *
 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardarrow
 *
 * @example
 * ```tsx
 * <HoverCard.Root>
 *   <HoverCard.Trigger asChild>
 *     <Button type="button" appearance="link" intent="accent">@username</Button>
 *   </HoverCard.Trigger>
 *   <HoverCard.Content>
 *     <HoverCard.Arrow />
 *     <p>This is the hover card content.</p>
 *   </HoverCard.Content>
 * </HoverCard.Root>
 * ```
 */
const Arrow = ({ className, height = 7, width = 14, ...props }: HoverCardArrowProps) => (
	// Why no asChild prop: a swapped element loses the two-layer shape — a filled
	// polygon, plus a polyline that strokes the slanted edges only — that continues
	// `HoverCard.Content`'s border. `HoverCardArrowProps` omits the prop, so restyle
	// with `className` instead. The `asChild` below is mantle's own, and hands that
	// shape to the primitive.
	<HoverCardPrimitive.Arrow
		aria-hidden="true"
		asChild
		data-slot="hover-card-arrow"
		height={height}
		width={width}
		{...props}
	>
		<svg
			className={cx(
				// `HoverCard.Content` is the wrapper's containing block, so Radix's own
				// `0` offset resolves to that content's padding box — the base lands 1px
				// inside the border box, and the fill covers the border it sits on.
				"fill-[var(--background-color-popover)]",
				// Why filter and clip-path: `HoverCard.Content`'s `shadow-md` stops at
				// its own border, so an unshadowed tip reads as pasted on. The filter
				// casts the tip's own shadow, and the clip trims it at the base, because
				// the arrow paints above the content and the shadow would otherwise
				// darken the content's interior. One wide, faint layer only, matching
				// what the content's shadow leaves along the edge the tip grows out of —
				// a tighter layer muddies a shape this small. The offsets stay symmetric,
				// since Radix rotates the wrapper per side and would swing an offset.
				"[clip-path:inset(0_-200%_-200%_-200%)]",
				"[filter:drop-shadow(0_0_4px_color-mix(in_oklab,var(--shadow-color)_var(--shadow-first-opacity),transparent))]",
				className,
			)}
		>
			<polygon points="0,0 30,0 15,10" />
			<polyline
				className="stroke-[color:var(--border-color-popover)]"
				fill="none"
				points="0,0 15,10 30,0"
				// Why 1.5 against the content's 1px border: antialiasing spreads a
				// diagonal hairline across two device rows at partial coverage, so a
				// geometric 1px reads thinner than the content's axis-aligned edge.
				// Measured against that edge at 1x and 2x, 1.5 matches it.
				strokeWidth={1.5}
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	</HoverCardPrimitive.Arrow>
);

/**
 * A floating card that appears when a user hovers over a trigger element.
 *
 * Use `HoverCard` for non-essential preview content shown on HOVER — user
 * cards, repo previews, rich link previews. Because hover is not reachable
 * via keyboard, all content inside a `HoverCard` must be supplemental,
 * never the only path to information; the trigger is typically a link that
 * already leads to the same content for keyboard and screen reader users.
 * For short, non-interactive labels or hints, use `Tooltip`. For
 * interactive overlays the user opens deliberately, use `Popover`.
 *
 * `HoverCard.Content` renders at Tailwind `z-50`, Mantle's shared floating
 * z-index. When multiple shared layers are open, the most recently mounted
 * layer renders on top.
 *
 * @see https://mantle.ngrok.com/components/overlays/hover-card
 *
 * @example
 * Composition:
 * ```
 * HoverCard.Root
 * ├── HoverCard.Trigger
 * └── HoverCard.Content
 *     └── HoverCard.Arrow
 * ```
 *
 * @example
 * ```tsx
 * <HoverCard.Root>
 *   <HoverCard.Trigger asChild>
 *     <Button type="button" appearance="outlined" intent="neutral">
 *       Hover me
 *     </Button>
 *   </HoverCard.Trigger>
 *   <HoverCard.Content>
 *     <p>This is the hover card content.</p>
 *   </HoverCard.Content>
 * </HoverCard.Root>
 * ```
 */
const HoverCard = {
	/**
	 * The root, stateful component that manages the open/closed state of the hover card.
	 *
	 * `HoverCard.Content` renders at Tailwind `z-50`, Mantle's shared floating
	 * z-index. When multiple shared layers are open, the most recently mounted
	 * layer renders on top.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardroot
	 *
	 * @example
	 * ```tsx
	 * <HoverCard.Root>
	 *   <HoverCard.Trigger asChild>
	 *     <Button type="button" appearance="outlined" intent="neutral">
	 *       Hover me
	 *     </Button>
	 *   </HoverCard.Trigger>
	 *   <HoverCard.Content>
	 *     <p>This is the hover card content.</p>
	 *   </HoverCard.Content>
	 * </HoverCard.Root>
	 * ```
	 */
	Root,
	/**
	 * An optional tip that points from `HoverCard.Content` at its trigger. It stays
	 * centered on the trigger when collision detection shifts or flips the content,
	 * and its border continues `HoverCard.Content`'s own edge.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardarrow
	 *
	 * @example
	 * ```tsx
	 * <HoverCard.Root>
	 *   <HoverCard.Trigger asChild>
	 *     <Button type="button" appearance="link" intent="accent">@username</Button>
	 *   </HoverCard.Trigger>
	 *   <HoverCard.Content side="top">
	 *     <HoverCard.Arrow />
	 *     <div className="space-y-2">
	 *       <Text weight="strong">User Profile</Text>
	 *       <Text>Additional information about the user.</Text>
	 *     </div>
	 *   </HoverCard.Content>
	 * </HoverCard.Root>
	 * ```
	 */
	Arrow,
	/**
	 * The content to render inside the hover card. Appears in a portal with rich styling and animations.
	 *
	 * `HoverCard.Content` renders at Tailwind `z-50`, Mantle's shared floating
	 * z-index. When multiple shared layers are open, the most recently mounted
	 * layer renders on top.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardcontent
	 *
	 * @example
	 * ```tsx
	 * <HoverCard.Root>
	 *   <HoverCard.Trigger asChild>
	 *     <Button type="button" appearance="link" intent="accent">@username</Button>
	 *   </HoverCard.Trigger>
	 *   <HoverCard.Content side="top">
	 *     <div className="space-y-2">
	 *       <Text weight="strong">User Profile</Text>
	 *       <Text>Additional information about the user.</Text>
	 *       <Button type="button" appearance="filled" intent="neutral" size="sm">Follow</Button>
	 *     </div>
	 *   </HoverCard.Content>
	 * </HoverCard.Root>
	 * ```
	 */
	Content,
	/**
	 * The portal container for rendering hover card content outside the normal DOM tree.
	 * `HoverCard.Content` already renders inside this portal internally, so you typically
	 * do not need to use `HoverCard.Portal` directly. Use it only when you need to
	 * customize portal placement or wrap multiple `HoverCard.Content` instances.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardportal
	 *
	 * @example
	 * ```tsx
	 * <HoverCard.Root>
	 *   <HoverCard.Trigger asChild>
	 *     <Button type="button" appearance="outlined" intent="neutral">
	 *       Hover me
	 *     </Button>
	 *   </HoverCard.Trigger>
	 *   <HoverCard.Portal>
	 *     <HoverCard.Content>
	 *       <p>This is the hover card content.</p>
	 *     </HoverCard.Content>
	 *   </HoverCard.Portal>
	 * </HoverCard.Root>
	 * ```
	 */
	Portal,
	/**
	 * The trigger element that opens the hover card when hovered.
	 *
	 * @see https://mantle.ngrok.com/components/overlays/hover-card#hovercardtrigger
	 *
	 * @example
	 * ```tsx
	 * <HoverCard.Root>
	 *   <HoverCard.Trigger asChild>
	 *     <Button type="button" appearance="ghost" intent="neutral">
	 *       Hover for details
	 *     </Button>
	 *   </HoverCard.Trigger>
	 *   <HoverCard.Content>
	 *     <div className="space-y-1">
	 *       <Text weight="strong">Quick Info</Text>
	 *       <Text>This appears when you hover over the trigger.</Text>
	 *     </div>
	 *   </HoverCard.Content>
	 * </HoverCard.Root>
	 * ```
	 */
	Trigger,
} as const;

export {
	//,
	HoverCard,
};
